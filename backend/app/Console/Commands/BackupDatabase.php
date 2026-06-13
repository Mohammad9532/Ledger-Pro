<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Spatie\DbDumper\Databases\MySql;
use Illuminate\Support\Facades\Storage;

class BackupDatabase extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:backup-db';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Creates a database backup and prunes old backups.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting database backup...');

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

            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN' && file_exists('C:\\xampp\\mysql\\bin\\mysqldump.exe')) {
                $dumper->setDumpBinaryPath('C:/xampp/mysql/bin/');
            } elseif (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN' && file_exists('c:\\xampp\\mysql\\bin\\mysqldump.exe')) {
                $dumper->setDumpBinaryPath('c:/xampp/mysql/bin/');
            }

            $dumper->dumpToFile($path);
            $this->info("Backup created: {$filename}");

            // Prune older backups (Keep last 30)
            $this->pruneOldBackups();

        } catch (\Exception $e) {
            $this->error('Backup failed: ' . $e->getMessage());
            return Command::FAILURE;
        }

        return Command::SUCCESS;
    }

    private function pruneOldBackups()
    {
        $files = Storage::disk('local')->files('backups');
        
        $backups = [];
        foreach ($files as $file) {
            if (str_ends_with($file, '.sql')) {
                $backups[] = [
                    'file' => $file,
                    'time' => Storage::disk('local')->lastModified($file)
                ];
            }
        }

        if (count($backups) <= 30) {
            return;
        }

        usort($backups, fn($a, $b) => $b['time'] <=> $a['time']); // Newest first

        $toDelete = array_slice($backups, 30);
        foreach ($toDelete as $item) {
            Storage::disk('local')->delete($item['file']);
            $this->info("Deleted old backup: " . basename($item['file']));
        }
    }
}
