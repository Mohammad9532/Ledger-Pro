<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Spatie\DbDumper\Databases\MySql;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;

class SystemController extends Controller
{
    public function health(): JsonResponse
    {
        $dbName = config('database.connections.mysql.database');
        
        $sizeQuery = DB::select("SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size FROM information_schema.tables WHERE table_schema = ?", [$dbName]);
        $countQuery = DB::select("SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = ?", [$dbName]);
        
        $backups = Storage::disk('local')->files('backups');
        $lastBackup = count($backups) > 0 ? date('Y-m-d H:i:s', Storage::disk('local')->lastModified(end($backups))) : null;

        return response()->json([
            'engine' => 'MySQL',
            'database' => $dbName,
            'size_mb' => $sizeQuery[0]->size ?? 0,
            'table_count' => $countQuery[0]->count ?? 0,
            'last_backup' => $lastBackup,
            'environment' => app()->environment(),
        ]);
    }

    public function status(): JsonResponse
    {
        $applicationStatus = 'OK';

        try {
            DB::connection()->getPdo();
            $databaseStatus = 'OK';
        } catch (\Exception $e) {
            $databaseStatus = 'ERROR';
        }

        $currentGitCommit = null;
        if (File::exists(base_path('.git/HEAD'))) {
            $head = File::get(base_path('.git/HEAD'));
            if (str_starts_with($head, 'ref:')) {
                $ref = trim(substr($head, 5));
                if (File::exists(base_path('.git/' . $ref))) {
                    $currentGitCommit = substr(trim(File::get(base_path('.git/' . $ref))), 0, 7);
                }
            } else {
                $currentGitCommit = substr(trim($head), 0, 7);
            }
        }
        if (!$currentGitCommit && function_exists('exec')) {
            $execResult = exec('git rev-parse --short HEAD');
            if ($execResult) {
                $currentGitCommit = $execResult;
            }
        }

        $totalStorageBytes = @disk_total_space(base_path()) ?: 0;
        $freeStorageBytes = @disk_free_space(base_path()) ?: 0;
        
        $totalStorageGb = $totalStorageBytes > 0 ? round($totalStorageBytes / 1024 / 1024 / 1024, 2) : 0;
        $freeStorageGb = $freeStorageBytes > 0 ? round($freeStorageBytes / 1024 / 1024 / 1024, 2) : 0;
        $usedStorageGb = max(0, $totalStorageGb - $freeStorageGb);
        
        $diskUsagePercentage = $totalStorageGb > 0 ? round(($usedStorageGb / $totalStorageGb) * 100, 2) : 0;

        $lastBackupLocal = null;
        $totalLocalBackupsCount = 0;
        $totalLocalBackupSizeMb = 0;
        $oldestLocalBackup = null;
        $backupTodayExists = false;

        $localFiles = [];
        if (File::isDirectory('/var/backups/ledger')) {
            $localFiles = File::files('/var/backups/ledger');
        } else {
            $files = Storage::disk('local')->files('backups');
            foreach ($files as $f) {
                if (str_ends_with($f, '.sql')) {
                    $localFiles[] = new \SplFileInfo(Storage::disk('local')->path($f));
                }
            }
        }

        if (count($localFiles) > 0) {
            $totalLocalBackupsCount = count($localFiles);
            $totalSize = 0;
            $dates = [];
            foreach ($localFiles as $f) {
                $totalSize += $f->getSize();
                $dates[] = $f->getMTime();
            }
            $totalLocalBackupSizeMb = round($totalSize / 1024 / 1024, 2);
            rsort($dates); // Newest first
            $lastBackupLocal = date('Y-m-d H:i:s', $dates[0]);
            $oldestLocalBackup = date('Y-m-d H:i:s', end($dates));
            if (time() - $dates[0] <= 86400) {
                $backupTodayExists = true;
            }
        }

        $lastBackupGoogleDrive = null;
        $googleDriveStatus = 'Not Installed';
        $googleDriveFilesCount = 0;

        $hasRclone = false;
        if (function_exists('exec')) {
            exec('rclone version 2>&1', $out, $code);
            if ($code === 0) {
                $hasRclone = true;
            }
        }

        if ($hasRclone) {
            exec('rclone --config /home/ubuntu/.config/rclone/rclone.conf lsjson gdrive:Ledger-Pro-Backups 2>&1', $rcloneOut, $rcloneCode);
            if ($rcloneCode === 0) {
                $googleDriveStatus = 'Connected';
                $json = json_decode(implode('', $rcloneOut), true);
                if (is_array($json)) {
                    $googleDriveFilesCount = count($json);
                    if ($googleDriveFilesCount > 0) {
                        usort($json, fn($a, $b) => strtotime($b['ModTime']) <=> strtotime($a['ModTime']));
                        $lastBackupGoogleDrive = date('Y-m-d H:i:s', strtotime($json[0]['ModTime']));
                    }
                }
            } else {
                $googleDriveStatus = 'Error';
            }
        } else {
            try {
                if (config('filesystems.disks.google')) {
                    $googleDriveStatus = 'Connected';
                    $files = Storage::disk('google')->files('Ledger-Pro-Backups');
                    $googleDriveFilesCount = count($files);
                    if ($googleDriveFilesCount > 0) {
                        $lastBackupGoogleDrive = date('Y-m-d H:i:s', Storage::disk('google')->lastModified(end($files)));
                    }
                } else if (File::isDirectory('/Ledger-Pro-Backups')) {
                     $googleDriveStatus = 'Connected';
                     $files = File::files('/Ledger-Pro-Backups');
                     $googleDriveFilesCount = count($files);
                     if ($googleDriveFilesCount > 0) {
                         usort($files, fn($a, $b) => $b->getMTime() <=> $a->getMTime());
                         $lastBackupGoogleDrive = date('Y-m-d H:i:s', $files[0]->getMTime());
                     }
                }
            } catch (\Exception $e) {
                $googleDriveStatus = 'Error';
            }
        }

        $lastDeploymentTime = null;
        if (File::exists(public_path('index.php'))) {
            $lastDeploymentTime = date('Y-m-d H:i:s', File::lastModified(public_path('index.php')));
        }

        return response()->json([
            'application_status' => $applicationStatus,
            'database_status' => $databaseStatus,
            'current_git_commit' => $currentGitCommit ?: 'unknown',
            'disk_usage_percentage' => $diskUsagePercentage,
            'total_storage_gb' => $totalStorageGb,
            'free_storage_gb' => $freeStorageGb,
            
            'last_backup_local' => $lastBackupLocal,
            'total_local_backups_count' => $totalLocalBackupsCount,
            'total_local_backup_size_mb' => $totalLocalBackupSizeMb,
            'oldest_local_backup' => $oldestLocalBackup,
            'backup_today_exists' => $backupTodayExists,

            'google_drive_status' => $googleDriveStatus,
            'google_drive_files_count' => $googleDriveFilesCount,
            'last_backup_google_drive' => $lastBackupGoogleDrive,

            'last_deployment_time' => $lastDeploymentTime,
            'php_version' => phpversion(),
            'laravel_version' => app()->version(),
            'server_time' => now()->toDateTimeString(),
        ]);
    }

    public function getBackups(): JsonResponse
    {
        if (!Storage::disk('local')->exists('backups')) {
            Storage::disk('local')->makeDirectory('backups');
        }

        $files = Storage::disk('local')->files('backups');
        $backups = [];

        foreach ($files as $file) {
            if (str_ends_with($file, '.sql')) {
                $backups[] = [
                    'filename' => basename($file),
                    'size_bytes' => Storage::disk('local')->size($file),
                    'created_at' => date('Y-m-d H:i:s', Storage::disk('local')->lastModified($file))
                ];
            }
        }

        usort($backups, fn($a, $b) => $b['created_at'] <=> $a['created_at']);

        return response()->json($backups);
    }

    public function createBackup(): JsonResponse
    {
        try {
            if (!Storage::disk('local')->exists('backups')) {
                Storage::disk('local')->makeDirectory('backups');
            }

            $filename = 'ledger_backup_' . date('Y_m_d_His') . '.sql';
            $path = Storage::disk('local')->path('backups/' . $filename);

            $dumper = MySql::create()
                ->setDbName(config('database.connections.mysql.database'))
                ->setUserName(config('database.connections.mysql.username'))
                ->setPassword(config('database.connections.mysql.password'))
                ->setHost(config('database.connections.mysql.host'))
                ->setPort(config('database.connections.mysql.port'));

            // Auto-detect Windows XAMPP path if present
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN' && file_exists('C:\\xampp\\mysql\\bin\\mysqldump.exe')) {
                $dumper->setDumpBinaryPath('C:/xampp/mysql/bin/');
            } elseif (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN' && file_exists('c:\\xampp\\mysql\\bin\\mysqldump.exe')) {
                $dumper->setDumpBinaryPath('c:/xampp/mysql/bin/');
            }

            $dumper->dumpToFile($path);

            return response()->json([
                'message' => 'Backup created successfully',
                'filename' => $filename
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to create backup: ' . $e->getMessage()], 500);
        }
    }

    public function downloadBackup($filename)
    {
        if (!Storage::disk('local')->exists('backups/' . $filename)) {
            return response()->json(['error' => 'Backup not found'], 404);
        }

        return Storage::disk('local')->download('backups/' . $filename);
    }

    public function restoreBackup(Request $request, $filename): JsonResponse
    {
        if (!Storage::disk('local')->exists('backups/' . $filename)) {
            return response()->json(['error' => 'Backup not found'], 404);
        }

        try {
            $path = Storage::disk('local')->path('backups/' . $filename);
            $sql = file_get_contents($path);

            // Execute the raw SQL
            DB::unprepared($sql);

            AuditLog::create([
                'user_id' => Auth::id() ?? 1,
                'action' => 'database_restore',
                'description' => "Restored database from backup file: {$filename}",
                'ip_address' => $request->ip(),
            ]);

            return response()->json(['message' => 'Database restored successfully']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Restore failed: ' . $e->getMessage()], 500);
        }
    }

    public function readiness(): JsonResponse
    {
        $issues = [];
        $migrationFiles = File::allFiles(database_path('migrations'));

        foreach ($migrationFiles as $file) {
            $content = file_get_contents($file->getPathname());
            
            if (preg_match('/->enum\(/', $content)) {
                $issues[] = "MySQL ENUM detected in " . $file->getFilename() . ". Postgres prefers string() with check constraints.";
            }
            if (preg_match('/SET FOREIGN_KEY_CHECKS/', $content)) {
                $issues[] = "MySQL FOREIGN_KEY_CHECKS disabled in " . $file->getFilename() . ". Postgres requires different constraints management.";
            }
        }

        $appFiles = File::allFiles(app_path());
        foreach ($appFiles as $file) {
            $content = file_get_contents($file->getPathname());
            if (preg_match('/DATE_FORMAT\(/i', $content)) {
                $issues[] = "MySQL DATE_FORMAT() used in " . $file->getFilename() . ". Postgres uses TO_CHAR().";
            }
            if (preg_match('/IFNULL\(/i', $content)) {
                $issues[] = "MySQL IFNULL() used in " . $file->getFilename() . ". Postgres uses COALESCE().";
            }
        }

        return response()->json([
            'status' => count($issues) === 0 ? 'Ready' : 'Issues Found',
            'issues' => $issues
        ]);
    }
}
