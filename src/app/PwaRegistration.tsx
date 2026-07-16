"use client";
import { memo, useEffect } from "react";
function PwaRegistration() { useEffect(() => { if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") void navigator.serviceWorker.register("/sw.js").catch(() => undefined); }, []); return null; }
export default memo(PwaRegistration);
