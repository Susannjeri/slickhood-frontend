// components/CurrencySelect.tsx
"use client";

import React from "react";
import Select from "react-select";

export default function CurrencySelect({ value, onChange, options }: any) {
  return (
    <Select
      value={value}
      onChange={onChange}
      options={options}
      isClearable
      placeholder="Select currency..."
    />
  );
}
