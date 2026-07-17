<?php

namespace App\Services\Registration;

use App\DTOs\RegistrationResult;
use Illuminate\Support\Facades\DB;
use Exception;
use Illuminate\Support\Str;
use App\Models\Master\Company;
use App\Events\RegisteredCompanyCreated;

class RegistrationOrchestrator
{
    public function __construct(
        private CompanyRegistrationService $companyService,
        private DatabaseProvisionService $provisionService,
        private TenantMigrationService $migrationService,
        private TenantSeederService $seederService,
        private OwnerUserService $ownerService
    ) {}

    public function registerCompany(array $data): RegistrationResult
    {
        $databaseName = null;
        
        try {
            $result = DB::connection('master')->transaction(function () use ($data, &$databaseName) {
                
                // Generate a 16-character unique database name
                do {
                    $databaseName = 'tenant_' . Str::lower(Str::random(16));
                } while (Company::where('database_name', $databaseName)->exists());

                // 1. Create Company
                $company = $this->companyService->createCompany($data, $databaseName);

                // 2. Create Database
                $this->provisionService->createDatabase($databaseName);

                // 3. Run Migrations
                $this->migrationService->migrate($databaseName);

                // 4. Seed Data
                $this->seederService->seed($databaseName);

                // 5. Create Owner
                $owner = $this->ownerService->createOwner($data, $company);

                $result = new RegistrationResult($company, $owner, $databaseName);
                $result->databaseCreated = true;
                $result->migrationsCompleted = true;
                $result->seedCompleted = true;

                return $result;
            });
            
            // Dispatch event outside the transaction so listeners don't fire if transaction fails
            RegisteredCompanyCreated::dispatch($result);

            return $result;
        } catch (Exception $e) {
            // Drop physical database if it was created
            if ($databaseName) {
                try {
                    $this->provisionService->dropDatabase($databaseName);
                } catch (Exception $dropEx) {
                    // Ignore drop error to preserve original exception
                }
            }

            throw $e;
        }
    }
}
