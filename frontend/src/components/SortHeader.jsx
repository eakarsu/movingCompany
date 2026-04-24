export default function SortHeader({ label, field, currentSort, currentOrder, onSort }) {
  const isActive = currentSort === field;

  const handleClick = () => {
    if (isActive) {
      onSort(field, currentOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(field, 'asc');
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 group"
    >
      {label}
      <span className="inline-flex flex-col">
        <svg
          className={`w-3 h-3 -mb-1 ${isActive && currentOrder === 'asc' ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M5 12l5-5 5 5H5z" />
        </svg>
        <svg
          className={`w-3 h-3 ${isActive && currentOrder === 'desc' ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M15 8l-5 5-5-5h10z" />
        </svg>
      </span>
    </button>
  );
}
