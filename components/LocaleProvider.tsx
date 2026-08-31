"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  isLocale,
  LOCALE_KEY,
  LOCALE_PARAM,
  type Locale,
} from "@/lib/i18n";

type Ctx = { locale: Locale; setLocale: (l: Locale) => void };

const LocaleContext = createContext<Ctx>({ locale: "ja", setLocale: () => {} });

export const useLocale = () => useContext(LocaleContext);

/** URLのクエリを ?lang=en に揃える。日本語のときは既定なので落とす */
function syncUrl(locale: Locale) {
  const url = new URL(window.location.href);
  if (locale === "en") url.searchParams.set(LOCALE_PARAM, locale);
  else url.searchParams.delete(LOCALE_PARAM);
  // pushState だと「戻る」で言語だけ戻ってしまい、スクロール位置とずれる
  window.history.replaceState(null, "", url);
}

export default function LocaleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // 初期値は必ず ja。静的に焼かれたHTMLと一致させて hydration のズレを防ぐ
  const [locale, setState] = useState<Locale>("ja");

  useEffect(() => {
    // URLでの明示 > 前回の選択 > 日本語。
    // navigator.language は見ない。読み手の多くは日本語話者なので、
    // 明示的に選ばれたときだけ英語にする
    const fromUrl = new URLSearchParams(window.location.search).get(
      LOCALE_PARAM,
    );
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(LOCALE_KEY);
    } catch {
      // プライベートブラウジング等で localStorage が使えなくても動かす
    }

    const next = isLocale(fromUrl) ? fromUrl : isLocale(stored) ? stored : "ja";
    if (next !== "ja") setState(next);
    // URLで来た場合はその選択を覚える
    if (isLocale(fromUrl) && fromUrl !== stored) {
      try {
        window.localStorage.setItem(LOCALE_KEY, fromUrl);
      } catch {}
    }
  }, []);

  // lang属性はスクリーンリーダーの読み上げと翻訳ツールの判定に効く
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setState(next);
    try {
      window.localStorage.setItem(LOCALE_KEY, next);
    } catch {}
    syncUrl(next);
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}
