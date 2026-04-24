export default function BulkActions({ selectedCount, onDelete, onUpdate, updateOptions }) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <span className="text-sm font-medium text-blue-800">
        {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
      </span>
      <div className="flex flex-wrap gap-2">
        {updateOptions && updateOptions.length > 0 && (
          <select
            onChange={(e) => {
              if (e.target.value) {
                const [field, value] = e.target.value.split(':');
                onUpdate({ [field]: value });
                e.target.value = '';
              }
            }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white"
            defaultValue=""
          >
            <option value="" disabled>Bulk Update...</option>
            {updateOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete Selected
          </button>
        )}
      </div>
    </div>
  );
}

export function SelectCheckbox({ checked, onChange, indeterminate }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      ref={(el) => {
        if (el) el.indeterminate = indeterminate || false;
      }}
      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
    />
  );
}
