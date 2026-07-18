@extends('reports.layout')

@section('content')
    <div class="section-title">PAYABLES SUMMARY</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>Vendor / Account Name</th>
                <th class="text-right">Balance Due</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['items'] as $item)
                <tr>
                    <td>{{ $item['name'] }}</td>
                    <td class="text-right">{{ number_format(abs($item['balance']), 2) }}</td>
                </tr>
            @empty
                <tr><td colspan="2" class="text-center" style="color:#999">No payables to display</td></tr>
            @endforelse
            <tr class="total-row">
                <td>TOTAL PAYABLES</td>
                <td class="text-right">{{ $currency ?? '' }} {{ number_format(abs($data['total']), 2) }}</td>
            </tr>
        </tbody>
    </table>
@endsection
