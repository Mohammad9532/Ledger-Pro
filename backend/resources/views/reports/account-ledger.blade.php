@extends('reports.layout')

@section('content')

@php
    $totalDebits = collect($data['entries'])->sum('debit');
    $totalCredits = collect($data['entries'])->sum('credit');
    $isContact = in_array($data['account']['type'] ?? '', ['person']);
@endphp

<!-- Dynamic Header suitable for Customers/Vendors or standard accounts -->
<div class="mb-20">
    <table class="w-100" cellpadding="0" cellspacing="0">
        <tr>
            <td class="w-50 align-top">
                <p style="font-size: 10px; color: #666; margin: 0 0 2px 0;">{{ $isContact ? 'Contact:' : 'Account:' }}</p>
                <h2 style="font-size: 14px; margin: 0 0 5px 0;">{{ $data['account']['name'] ?? 'Unknown' }}</h2>
                <p style="font-size: 10px; margin: 0;">Type: <span style="text-transform: capitalize;">{{ str_replace('_', ' ', $data['account']['type'] ?? 'Unknown') }}</span></p>
            </td>
            <td class="w-50 align-top text-right">
                <p style="font-size: 10px; color: #666; margin: 0 0 2px 0;">Period:</p>
                <p style="font-size: 11px; font-weight: bold; margin: 0;">{{ $period }}</p>
            </td>
        </tr>
    </table>
</div>

<!-- Improved Summary Section -->
<div class="summary-wrapper">
    <table class="w-100" cellpadding="0" cellspacing="0">
        <tr>
            <td style="width: 25%; padding-right: 5px;">
                <div class="summary-card">
                    <div class="summary-card-title">Opening Balance</div>
                    <div class="summary-card-value text-equity">{{ $currency ?? '' }} {{ number_format(abs($data['opening_balance']), 2) }}</div>
                </div>
            </td>
            <td style="width: 25%; padding-right: 5px; padding-left: 5px;">
                <div class="summary-card">
                    <div class="summary-card-title">Total Debits</div>
                    <div class="summary-card-value text-asset">{{ $currency ?? '' }} {{ number_format($totalDebits, 2) }}</div>
                </div>
            </td>
            <td style="width: 25%; padding-right: 5px; padding-left: 5px;">
                <div class="summary-card">
                    <div class="summary-card-title">Total Credits</div>
                    <div class="summary-card-value text-liability">{{ $currency ?? '' }} {{ number_format($totalCredits, 2) }}</div>
                </div>
            </td>
            <td style="width: 25%; padding-left: 5px;">
                <div class="summary-card" style="border: 1px solid #333;">
                    <div class="summary-card-title">Closing Balance</div>
                    <div class="summary-card-value font-bold" style="color: #111;">{{ $currency ?? '' }} {{ number_format(abs($data['closing_balance']), 2) }}</div>
                </div>
            </td>
        </tr>
    </table>
</div>

<!-- Statement Data Table -->
<table class="data-table">
    <thead>
        <tr>
            <th style="width: 12%">Date</th>
            <th style="width: 15%">Voucher</th>
            <th style="width: 33%">Description</th>
            <th class="text-right" style="width: 13%">Debit</th>
            <th class="text-right" style="width: 13%">Credit</th>
            <th class="text-right" style="width: 14%">Balance</th>
        </tr>
    </thead>
    <tbody>
        <tr class="subtotal-row">
            <td colspan="5">Opening Balance</td>
            <td class="text-right">{{ number_format($data['opening_balance'], 2) }}</td>
        </tr>
        
        @forelse($data['entries'] as $entry)
            <tr>
                <td>{{ \Carbon\Carbon::parse($entry['date'])->format('d M Y') }}</td>
                <td>{{ $entry['reference_number'] ?: ('TXN-' . str_pad($entry['transaction_id'], 4, '0', STR_PAD_LEFT)) }}</td>
                <td>{{ $entry['description'] ?: '-' }}</td>
                <td class="text-right">{{ (float)$entry['debit'] > 0 ? number_format($entry['debit'], 2) : '' }}</td>
                <td class="text-right">{{ (float)$entry['credit'] > 0 ? number_format($entry['credit'], 2) : '' }}</td>
                <td class="text-right">{{ number_format($entry['balance'], 2) }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="6" class="text-center" style="color:#999; padding: 20px;">No transactions found in this period.</td>
            </tr>
        @endforelse
        
        <tr class="total-row">
            <td colspan="3">CLOSING TOTALS</td>
            <td class="text-right">{{ number_format($totalDebits, 2) }}</td>
            <td class="text-right">{{ number_format($totalCredits, 2) }}</td>
            <td class="text-right">{{ $currency ?? '' }} {{ number_format($data['closing_balance'], 2) }}</td>
        </tr>
    </tbody>
</table>

@endsection
