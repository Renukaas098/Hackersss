import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getMeta } from "../api";

const MetaContext = createContext(null);
const CITY_KEY = "fpi_city";

function savedCity() {
  try {
    return localStorage.getItem(CITY_KEY) || "pune";
  } catch {
    return "pune";
  }
}

// Loads /api/meta once and holds the selected city for every page.
export function MetaProvider({ children }) {
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [city, setCityState] = useState(savedCity);

  const load = useCallback(() => {
    setError(null);
    getMeta().then(setMeta, setError);
  }, []);

  useEffect(load, [load]);

  const setCity = useCallback((id) => {
    setCityState(id);
    try {
      localStorage.setItem(CITY_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => {
    const lookup = (list) => (id) => list?.find((x) => x.id === id);
    return {
      meta,
      error,
      reload: load,
      city,
      setCity,
      cityById: lookup(meta?.cities),
      materialById: lookup(meta?.materials),
      areaById: lookup(meta?.areas),
      gradeById: lookup(meta?.grades),
    };
  }, [meta, error, load, city, setCity]);

  return <MetaContext.Provider value={value}>{children}</MetaContext.Provider>;
}

export const useMeta = () => useContext(MetaContext);
