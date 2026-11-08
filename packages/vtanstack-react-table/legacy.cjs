"use client";
const api = require("./index.cjs");
module.exports = {
  useLegacyTable: api.useLegacyTable,
  legacyCreateColumnHelper: api.legacyCreateColumnHelper,
  getCoreRowModel: api.getCoreRowModel,
  getFilteredRowModel: api.getFilteredRowModel,
  getSortedRowModel: api.getSortedRowModel,
  getGroupedRowModel: api.getGroupedRowModel,
  getExpandedRowModel: api.getExpandedRowModel,
  getPaginationRowModel: api.getPaginationRowModel,
  getFacetedRowModel: api.getFacetedRowModel,
  getFacetedUniqueValues: api.getFacetedUniqueValues,
  getFacetedMinMaxValues: api.getFacetedMinMaxValues,
};
