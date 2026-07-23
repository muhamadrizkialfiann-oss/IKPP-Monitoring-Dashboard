import React, { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  getValue?: (item: T) => any;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  onRowClick?: (item: T) => void;
  itemsPerPage?: number;
  defaultSortKey?: keyof T | string;
  defaultSortDirection?: "asc" | "desc";
}

export default function DataTable<T extends { id?: string; unitId?: string }>({
  columns,
  data,
  onRowClick,
  itemsPerPage = 10,
  defaultSortKey = null,
  defaultSortDirection = "asc"
}: DataTableProps<T>) {
  // Sorting State
  const [sortKey, setSortKey] = useState<keyof T | string | null>(defaultSortKey);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(defaultSortDirection);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Sorting logic
  const handleSort = (key: keyof T | string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setCurrentPage(1); // Reset page to 1 on sort
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    const columnDef = columns.find((col) => col.key === sortKey);

    return [...data].sort((a, b) => {
      let valA = columnDef?.getValue ? columnDef.getValue(a) : (a as any)[sortKey];
      let valB = columnDef?.getValue ? columnDef.getValue(b) : (b as any)[sortKey];

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      // Type-based comparison
      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      const strA = String(valA).trim();
      const strB = String(valB).trim();

      // Check if both strings look like dates (e.g. "10 Jul 2026", "08 Jul 2026, 14:00")
      const isDateA = /\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/.test(strA) || (!isNaN(Date.parse(strA)) && isNaN(Number(strA)));
      const isDateB = /\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/.test(strB) || (!isNaN(Date.parse(strB)) && isNaN(Number(strB)));

      if (isDateA && isDateB) {
        const timeA = Date.parse(strA);
        const timeB = Date.parse(strB);

        if (!isNaN(timeA) && !isNaN(timeB)) {
          return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
        }
      }

      // Default string comparison
      const lowerA = strA.toLowerCase();
      const lowerB = strB.toLowerCase();

      if (lowerA < lowerB) return sortDirection === "asc" ? -1 : 1;
      if (lowerA > lowerB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDirection, columns]);

  // Paginated Data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(data.length / itemsPerPage) || 1;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col justify-between">
      {/* Table Container */}
      <div className="overflow-x-auto min-h-[420px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">
              <th className="py-4 px-5 w-12 text-center font-bold">No</th>
              {columns.map((col) => (
                <th
                  key={col.header}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`py-4 px-4 font-bold ${
                    col.sortable !== false ? "cursor-pointer hover:bg-gray-100 select-none group" : ""
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable !== false && (
                      <span className="text-gray-400 group-hover:text-gray-600 transition-colors">
                        {sortKey === col.key ? (
                          sortDirection === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {paginatedData.length > 0 ? (
              paginatedData.map((item, idx) => {
                const globalIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                const rowKey = item.id || item.unitId || `row-${idx}`;
                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={`hover:bg-blue-50/30 transition-colors ${
                      onRowClick ? "cursor-pointer" : ""
                    }`}
                  >
                    <td className="py-3.5 px-5 text-center font-mono text-xs text-gray-400 font-bold">
                      {globalIndex}
                    </td>
                    {columns.map((col) => (
                      <td key={col.header} className="py-3.5 px-4 text-gray-700 font-medium">
                        {col.render ? col.render(item) : (item as any)[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="py-12 text-center text-gray-400 font-medium">
                  No records match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="bg-gray-50/50 border-t border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="text-xs font-bold text-gray-500">
          Showing <span className="text-gray-800">{(currentPage - 1) * itemsPerPage + (data.length > 0 ? 1 : 0)}</span> to{" "}
          <span className="text-gray-800">
            {Math.min(currentPage * itemsPerPage, data.length)}
          </span>{" "}
          of <span className="text-gray-800">{data.length}</span> entries
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                // Show first, last, and surrounding pages
                return (
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 1
                );
              })
              .map((page, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && page - prev > 1;

                return (
                  <React.Fragment key={page}>
                    {showEllipsis && <span className="text-gray-400 text-xs px-1">...</span>}
                    <button
                      onClick={() => handlePageChange(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        currentPage === page
                          ? "bg-[#0B2C6B] text-white shadow-md shadow-blue-900/10"
                          : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
