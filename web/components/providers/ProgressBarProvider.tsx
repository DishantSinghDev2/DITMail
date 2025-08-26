// components/providers/ProgressBarProvider.tsx

"use client"; // <--- This is the most important line!

import { AppProgressBar as ProgressBar } from 'next-nprogress-bar';
import React from 'react';

export const ProgressBarProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <ProgressBar
        height="3px"
        color="#2563eb"
        options={{ showSpinner: false }}
        shallowRouting
      />
      {children}
    </>
  );
};