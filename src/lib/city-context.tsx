import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type CityCtx = {
  cityId: string | null;
  cityName: string | null;
  hydrated: boolean;
  setCity: (id: string, name: string) => void;
  clearCity: () => void;
  pickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
};

const Ctx = createContext<CityCtx | null>(null);
const KEY_ID = "marketly.cityId";
const KEY_NAME = "marketly.cityName";

export function CityProvider({ children }: { children: ReactNode }) {
  const [cityId, setCityId] = useState<string | null>(null);
  const [cityName, setCityName] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    try {
      setCityId(localStorage.getItem(KEY_ID));
      setCityName(localStorage.getItem(KEY_NAME));
    } catch {}
    setHydrated(true);
  }, []);

  const setCity = (id: string, name: string) => {
    try {
      localStorage.setItem(KEY_ID, id);
      localStorage.setItem(KEY_NAME, name);
    } catch {}
    setCityId(id);
    setCityName(name);
    setPickerOpen(false);
  };

  const clearCity = () => {
    try {
      localStorage.removeItem(KEY_ID);
      localStorage.removeItem(KEY_NAME);
    } catch {}
    setCityId(null);
    setCityName(null);
  };

  return (
    <Ctx.Provider
      value={{
        cityId,
        cityName,
        hydrated,
        setCity,
        clearCity,
        pickerOpen,
        openPicker: () => setPickerOpen(true),
        closePicker: () => setPickerOpen(false),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCity() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCity must be used within CityProvider");
  return v;
}
