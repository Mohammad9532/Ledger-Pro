<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant\ChequeReminder;
use Illuminate\Http\Request;

class ChequeReminderController extends Controller
{
    public function index(Request $request)
    {
        $query = ChequeReminder::with('contact')->orderBy('due_date', 'asc');
        
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:receivable,payable',
            'cheque_number' => 'required|string|max:100',
            'bank_name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'due_date' => 'required|date',
            'contact_id' => 'nullable|exists:contacts,id',
            'notes' => 'nullable|string',
        ]);

        $validated['status'] = 'pending';
        $validated['created_by'] = auth()->id();
        $validated['updated_by'] = auth()->id();

        $cheque = ChequeReminder::create($validated);

        return response()->json(['message' => 'Cheque reminder created successfully', 'data' => $cheque], 201);
    }

    public function update(Request $request, $id)
    {
        $cheque = ChequeReminder::findOrFail($id);

        if ($cheque->status !== 'pending') {
            return response()->json(['message' => 'Only pending cheques can be edited.'], 403);
        }

        $validated = $request->validate([
            'cheque_number' => 'required|string|max:100',
            'bank_name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'due_date' => 'required|date',
            'contact_id' => 'nullable|exists:contacts,id',
            'notes' => 'nullable|string',
        ]);

        $validated['updated_by'] = auth()->id();
        $cheque->update($validated);

        return response()->json(['message' => 'Cheque reminder updated successfully', 'data' => $cheque]);
    }

    public function updateStatus(Request $request, $id)
    {
        $cheque = ChequeReminder::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:pending,cleared,bounced,cancelled',
        ]);

        $cheque->status = $validated['status'];
        $cheque->updated_by = auth()->id();
        $cheque->save();

        return response()->json(['message' => 'Cheque status updated successfully', 'data' => $cheque]);
    }

    public function destroy($id)
    {
        $cheque = ChequeReminder::findOrFail($id);

        if ($cheque->status !== 'pending') {
            return response()->json(['message' => 'Only pending cheques can be deleted. Please cancel it instead.'], 403);
        }

        if ($cheque->reminderSends()->exists()) {
            return response()->json(['message' => 'This cheque has historical reminder records and cannot be deleted. Please mark it as cancelled instead.'], 403);
        }

        $cheque->delete();

        return response()->json(['message' => 'Cheque reminder deleted successfully.']);
    }
}
