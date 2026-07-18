@extends('reports.layout')

@section('content')
    <!-- Executive Summary Cards -->
    <table class="summary-wrapper" cellpadding="0" cellspacing="0">
        <tr>
            <td width="31%" class="summary-card">
                <div class="summary-card-title">Inflows</div>
                <div class="summary-card-value text-asset">{{ number_format($data['inflows'], 2) }}</div>
            </td>
            <td width="3.5%"></td>
            <td width="31%" class="summary-card">
                <div class="summary-card-title">Outflows</div>
                <div class="summary-card-value text-liability">{{ number_format($data['outflows'], 2) }}</div>
            </td>
            <td width="3.5%"></td>
            <td width="31%" class="summary-card">
                <div class="summary-card-title">Net Flow</div>
                <div class="summary-card-value text-equity">{{ number_format($data['net_flow'], 2) }}</div>
            </td>
        </tr>
    </table>

    <div class="section-title">CASH FLOW SUMMARY</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>Description</th>
                <th class="text-right">Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Total Inflows</td>
                <td class="text-right">{{ number_format($data['inflows'], 2) }}</td>
            </tr>
            <tr>
                <td>Total Outflows</td>
                <td class="text-right">{{ number_format($data['outflows'], 2) }}</td>
            </tr>
            <tr class="total-row">
                <td>NET CASH FLOW</td>
                <td class="text-right">{{ $currency ?? '' }} {{ number_format($data['net_flow'], 2) }}</td>
            </tr>
        </tbody>
    </table>
@endsection
