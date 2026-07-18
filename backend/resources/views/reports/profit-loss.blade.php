@extends('reports.layout')

@section('content')
    <!-- Executive Summary Cards -->
    <table class="summary-wrapper" cellpadding="0" cellspacing="0">
        <tr>
            <td width="31%" class="summary-card">
                <div class="summary-card-title">Total Income</div>
                <div class="summary-card-value text-asset">{{ number_format($data['total_income'], 2) }}</div>
            </td>
            <td width="3.5%"></td>
            <td width="31%" class="summary-card">
                <div class="summary-card-title">Total Expenses</div>
                <div class="summary-card-value text-liability">{{ number_format($data['total_expense'], 2) }}</div>
            </td>
            <td width="3.5%"></td>
            <td width="31%" class="summary-card">
                <div class="summary-card-title">Net Profit</div>
                <div class="summary-card-value text-equity">{{ number_format($data['net_profit'], 2) }}</div>
            </td>
        </tr>
    </table>

    <div class="section-title">INCOME</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>Account Name</th>
                <th class="text-right">Balance</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['income'] as $item)
                <tr>
                    <td>{{ $item['name'] }}</td>
                    <td class="text-right">{{ number_format($item['amount'], 2) }}</td>
                </tr>
            @empty
                <tr><td colspan="2" class="text-center" style="color:#999">No income to display</td></tr>
            @endforelse
            <tr class="subtotal-row">
                <td>TOTAL INCOME</td>
                <td class="text-right">{{ $currency ?? '' }} {{ number_format($data['total_income'], 2) }}</td>
            </tr>
        </tbody>
    </table>

    <div class="section-title" style="margin-top: 30px;">EXPENSES</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>Account Name</th>
                <th class="text-right">Balance</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['expenses'] as $item)
                <tr>
                    <td>{{ $item['name'] }}</td>
                    <td class="text-right">{{ number_format($item['amount'], 2) }}</td>
                </tr>
            @empty
                <tr><td colspan="2" class="text-center" style="color:#999">No expenses to display</td></tr>
            @endforelse
            <tr class="subtotal-row">
                <td>TOTAL EXPENSES</td>
                <td class="text-right">{{ $currency ?? '' }} {{ number_format($data['total_expense'], 2) }}</td>
            </tr>
        </tbody>
    </table>

    <table class="data-table" style="margin-top: 30px;">
        <tr class="total-row" style="background-color: #f8f9fa;">
            <td>NET PROFIT</td>
            <td class="text-right">{{ $currency ?? '' }} {{ number_format($data['net_profit'], 2) }}</td>
        </tr>
    </table>
@endsection
