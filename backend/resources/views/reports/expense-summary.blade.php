@extends('reports.layout')

@section('content')
    <div class="section-title">EXPENSES BY CATEGORY</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>Category</th>
                <th class="text-right">Transaction Count</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['categories'] as $item)
                <tr>
                    <td>{{ $item['category_name'] ?? 'Uncategorized' }}</td>
                    <td class="text-right">{{ $item['count'] }}</td>
                    <td class="text-right">{{ number_format($item['total'], 2) }}</td>
                </tr>
            @empty
                <tr><td colspan="3" class="text-center" style="color:#999">No expenses to display</td></tr>
            @endforelse
            <tr class="total-row">
                <td colspan="2">TOTAL EXPENSES</td>
                <td class="text-right">{{ $currency ?? '' }} {{ number_format($data['grand_total'], 2) }}</td>
            </tr>
        </tbody>
    </table>
@endsection
