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
        if (File::isDirectory('/var/backups/ledger')) {
            $files = File::files('/var/backups/ledger');
            if (count($files) > 0) {
                usort($files, fn($a, $b) => $b->getMTime() <=> $a->getMTime());
                $lastBackupLocal = date('Y-m-d H:i:s', $files[0]->getMTime());
            }
        } else {
            // Fallback to local storage path
            $files = Storage::disk('local')->files('backups');
            if (count($files) > 0) {
                $lastBackupLocal = date('Y-m-d H:i:s', Storage::disk('local')->lastModified(end($files)));
            }
        }

        $lastBackupGoogleDrive = null;
        try {
            if (config('filesystems.disks.google')) {
                $files = Storage::disk('google')->files('Ledger-Pro-Backups');
                if (count($files) > 0) {
                    $lastBackupGoogleDrive = date('Y-m-d H:i:s', Storage::disk('google')->lastModified(end($files)));
                }
            } else if (File::isDirectory('/Ledger-Pro-Backups')) {
                 $files = File::files('/Ledger-Pro-Backups');
                 if (count($files) > 0) {
                     usort($files, fn($a, $b) => $b->getMTime() <=> $a->getMTime());
                     $lastBackupGoogleDrive = date('Y-m-d H:i:s', $files[0]->getMTime());
                 }
            }
        } catch (\Exception $e) {
            // Ignore
        }

        return response()->json([
            'application_status' => $applicationStatus,
            'database_status' => $databaseStatus,
            'current_git_commit' => $currentGitCommit ?: 'unknown',
            'disk_usage_percentage' => $diskUsagePercentage,
            'total_storage_gb' => $totalStorageGb,
            'free_storage_gb' => $freeStorageGb,
            'last_backup_local' => $lastBackupLocal,
            'last_backup_google_drive' => $lastBackupGoogleDrive,
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
