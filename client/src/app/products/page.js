"use client";

import { Suspense } from "react";
import ProductsContent from "./ProductsContent";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductsContent />
    </Suspense>
  );
}