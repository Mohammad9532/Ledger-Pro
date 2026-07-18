@extends('reports.layout')

@section('content')
    <div class="section-title">INCOME BY SOURCE</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>Source</th>
                <th class="text-right">Amount</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['items'] as $item)
                <tr>
                    <td>{{ $item['name'] }}</td>
                    <td class="text-right">{{ number_format($item['amount'], 2) }}</td>
                </tr>
            @empty
                <tr><td colspan="2" class="text-center" style="color:#999">No income to display</td></tr>
            @endforelse
            <tr class="total-row">
                <td>TOTAL INCOME</td>
                <td class="text-right">{{ $currency ?? '' }} {{ number_format($data['total'], 2) }}</td>
            </tr>
        </tbody>
    </table>
@endsection
