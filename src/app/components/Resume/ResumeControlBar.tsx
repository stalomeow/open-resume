"use client";
import { useEffect } from "react";
import { useSetDefaultScale } from "components/Resume/hooks";
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import ReactPDF, { usePDF } from "@react-pdf/renderer";
import dynamic from "next/dynamic";
import { store } from "lib/redux/store";
import { deepMerge } from "lib/deep-merge";
import { initialResumeState, setResume } from "lib/redux/resumeSlice";
import { Settings, initialSettings, setSettings } from "lib/redux/settingsSlice";
import { Resume } from "lib/redux/types";
import { useAppDispatch } from "lib/redux/hooks";

const downloadFile = (fileName: string, blob: Blob) => {
  var a = document.createElement("a");
  a.download = fileName;
  a.style.display = "none";
  a.href = URL.createObjectURL(blob);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

const saveResume = (fileName: string, pdf: ReactPDF.UsePDFInstance) => {
  downloadFile(fileName, pdf.blob!);
  downloadFile(fileName + ".json", new Blob([JSON.stringify(store.getState())]));
};

const loadResume = async (files: FileList | null, handleStateChange: (state: any) => void) => {
  if (files == null || files.length !== 1) {
    return;
  }

  const state = JSON.parse(await files[0].text());
  handleStateChange(state);
};

const ResumeControlBar = ({
  scale,
  setScale,
  documentSize,
  document,
  fileName,
}: {
  scale: number;
  setScale: (scale: number) => void;
  documentSize: string;
  document: JSX.Element;
  fileName: string;
}) => {
  const { scaleOnResize, setScaleOnResize } = useSetDefaultScale({
    setScale,
    documentSize,
  });

  const [instance, update] = usePDF({ document });

  // Hook to update pdf when document changes
  useEffect(() => {
    update();
  }, [update, document]);

  const dispatch = useAppDispatch();

  const handleStateChange = (state: any) => {
    if (!state) return;
    if (state.resume) {
      // We merge the initial state with the stored state to ensure
      // backward compatibility, since new fields might be added to
      // the initial state over time.
      const mergedResumeState = deepMerge(
        initialResumeState,
        state.resume
      ) as Resume;
      dispatch(setResume(mergedResumeState));
    }
    if (state.settings) {
      const mergedSettingsState = deepMerge(
        initialSettings,
        state.settings
      ) as Settings;
      dispatch(setSettings(mergedSettingsState));
    }
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 flex h-[var(--resume-control-bar-height)] items-center justify-center px-[var(--resume-padding)] text-gray-600 lg:justify-between">
      <div className="flex items-center gap-2">
        <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.01}
          value={scale}
          onChange={(e) => {
            setScaleOnResize(false);
            setScale(Number(e.target.value));
          }}
        />
        <div className="w-10">{`${Math.round(scale * 100)}%`}</div>
        <label className="hidden items-center gap-1 lg:flex">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4"
            checked={scaleOnResize}
            onChange={() => setScaleOnResize((prev) => !prev)}
          />
          <span className="select-none">Autoscale</span>
        </label>
      </div>
      <a
        className="ml-1 flex items-center gap-1 rounded-md border border-gray-300 px-3 py-0.5 hover:bg-gray-100 lg:ml-6 cursor-pointer"
        onClick={() => saveResume(fileName, instance)}
      >
        <ArrowDownTrayIcon className="h-4 w-4" />
        <span className="whitespace-nowrap">Save</span>
      </a>
      <a
        className="ml-1 flex items-center gap-1 rounded-md border border-gray-300 px-3 py-0.5 hover:bg-gray-100 lg:ml-6 cursor-pointer"
        onClick={(e) => (e.currentTarget.firstElementChild as HTMLInputElement).click()}
      >
        <input
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={(e) => loadResume(e.target.files, handleStateChange)}
        />
        <ArrowUpTrayIcon className="h-4 w-4" />
        <span className="whitespace-nowrap">Load</span>
      </a>
    </div>
  );
};

/**
 * Load ResumeControlBar client side since it uses usePDF, which is a web specific API
 */
export const ResumeControlBarCSR = dynamic(
  () => Promise.resolve(ResumeControlBar),
  {
    ssr: false,
  }
);

export const ResumeControlBarBorder = () => (
  <div className="absolute bottom-[var(--resume-control-bar-height)] w-full border-t-2 bg-gray-50" />
);
