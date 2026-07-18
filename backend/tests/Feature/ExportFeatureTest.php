<?php
namespace Tests\Feature;
use Tests\TestCase;
use App\Models\User;
use App\Models\Tenant\Account;

class ExportFeatureTest extends TestCase
{
    public function test_export_endpoint()
    {
        $user = User::first();
        // Assume user has a company. Setup tenant context by logging in
        $response = $this->actingAs($user)->getJson('/api/reports/account-ledger/export?account_id=2&format=pdf');
        
        if ($response->status() !== 200) {
            echo "Failed with status: " . $response->status() . "\n";
            echo "Response: " . $response->content() . "\n";
        } else {
            echo "Success!";
        }
    }
}
