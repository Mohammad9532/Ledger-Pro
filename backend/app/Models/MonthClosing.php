<?php

namespace App\Models;

use App\Models\Tenant\TenantModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MonthClosing extends TenantModel
{
    protected $fillable = [
        'year',
        'month',
        'status',
        'notes',
        'closed_by',
        'closed_at',
        'reopened_by',
        'reopened_at',
    ];

    protected $casts = [
        'closed_at' => 'datetime',
        'reopened_at' => 'datetime',
    ];

    public function closedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function reopenedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reopened_by');
    }

    /**
     * Check if a given date falls in a closed month.
     */
    public static function isDateLocked(string $date): bool
    {
        $parsed = \Carbon\Carbon::parse($date);

        return self::where('year', $parsed->year)
            ->where('month', $parsed->month)
            ->where('status', 'closed')
            ->exists();
    }

    /**
     * Get the label for this month (e.g., "January 2026").
     */
    public function getMonthLabelAttribute(): string
    {
        return date('F Y', mktime(0, 0, 0, $this->month, 1, $this->year));
    }
}
