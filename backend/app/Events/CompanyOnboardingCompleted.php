<?php

namespace App\Events;

use App\Models\Master\Company;
use App\Models\Tenant\CompanyProfile;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CompanyOnboardingCompleted
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Company $company,
        public CompanyProfile $profile
    ) {}
}
