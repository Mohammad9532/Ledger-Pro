<?php

namespace App\DTOs;

use App\Models\Master\Company;
use App\Models\Master\User;

class RegistrationResult
{
    public function __construct(
        public Company $company,
        public User $owner,
        public string $databaseName,
        public bool $databaseCreated = false,
        public bool $migrationsCompleted = false,
        public bool $seedCompleted = false
    ) {}
}
