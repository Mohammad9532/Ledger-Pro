<?php

namespace Tests\Feature;

use App\Models\BusinessItem;
use App\Models\Master\Company;
use App\Models\Master\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\View;
use Tests\TestCase;

class FlightDocumentTest extends TestCase
{
    private BusinessItem $item;

    protected function setUp(): void
    {
        parent::setUp();

        // This test never connects to the configured master or tenant database.
        config(['database.connections.tenant' => [
            'driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '',
        ]]);
        DB::purge('tenant');
        Schema::connection('tenant')->create('business_items', function (Blueprint $table) {
            $table->id();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
        Schema::connection('tenant')->create('company_profiles', function (Blueprint $table) {
            $table->id();
        });

        $user = new User(['name' => 'Test User']);
        $user->setRelation('company', new Company(['company_name' => 'Test Travel']));
        $this->actingAs($user)->withoutMiddleware();
        $this->item = BusinessItem::create(['metadata' => ['internal_note' => 'Preserve this']]);
    }

    public function test_professional_template_downloads_and_remembers_the_selection(): void
    {
        $renderedData = [];
        View::composer('tickets.flight-professional', function ($view) use (&$renderedData) {
            $renderedData = $view->getData()['data'];
        });
        $response = $this->postJson("/api/business-items/{$this->item->id}/documents", [
            'document_type' => 'flight',
            'data' => [
                'template' => 'professional',
                'passengers' => [['title' => 'Ms', 'first_name' => 'Aisha', 'last_name' => 'Rahman']],
                'segments' => [
                    ['airline' => 'Emirates', 'pnr' => 'NEW123', 'from' => 'Dubai (DXB)', 'to' => 'London (LHR)'],
                    ['same_as_first' => true, 'pnr' => 'OLD123', 'from' => 'London (LHR)', 'to' => 'Dubai (DXB)'],
                ],
            ],
        ]);

        $response->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $response->getContent());
        $this->assertSame('professional', $this->item->fresh()->metadata['template']);
        $this->assertSame('Preserve this', $this->item->fresh()->metadata['internal_note']);
        $this->assertSame('NEW123', $renderedData['segments'][1]['pnr']);

        // Older clients can omit the field without losing a saved selection.
        $this->postJson("/api/business-items/{$this->item->id}/documents", [
            'document_type' => 'flight', 'data' => ['status' => 'Pending'],
        ])->assertOk();
        $this->assertSame('professional', $this->item->fresh()->metadata['template']);
    }

    public function test_existing_documents_default_to_classic_and_normalize_legacy_fields(): void
    {
        $renderedData = [];
        View::composer('tickets.flight', function ($view) use (&$renderedData) {
            $renderedData = $view->getData()['data'];
        });
        $this->postJson("/api/business-items/{$this->item->id}/documents", [
            'document_type' => 'flight',
            'data' => [
                'passenger' => ['first_name' => 'Aisha'],
                'flight' => ['airline' => 'Test Airline', 'pnr' => 'LEGACY'],
                'journey' => ['from' => 'Dubai (DXB)', 'to' => 'London (LHR)'],
            ],
        ])->assertOk()->assertHeader('content-type', 'application/pdf');

        $this->assertSame('classic', $this->item->fresh()->metadata['template']);
        $this->assertSame('LEGACY', $renderedData['segments'][0]['pnr']);
        $this->assertSame('Dubai (DXB)', $renderedData['segments'][0]['from']);
    }

    public function test_unknown_templates_are_rejected_before_changing_metadata(): void
    {
        $this->postJson("/api/business-items/{$this->item->id}/documents", [
            'document_type' => 'flight', 'data' => ['template' => '../../other-view'],
        ])->assertUnprocessable()->assertJsonValidationErrors('data.template');

        $this->assertSame(['internal_note' => 'Preserve this'], $this->item->fresh()->metadata);
    }
}
