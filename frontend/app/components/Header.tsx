"use client";

import { RefObject, useState } from "react";

interface HeaderProps {
  hasDocument: boolean;
  documentName: string | null;
  messagesCount: number;
  isUploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onHealthCheck: () => void;
  onClearDocument: () => void;
  onClearChat: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function Header({
  hasDocument,
  documentName,
  messagesCount,
  isUploading,
  fileInputRef,
  onHealthCheck,
  onClearDocument,
  onClearChat,
  onFileUpload,
}: HeaderProps) {
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);

  return (
    <header className="navbar bg-base-200/50 backdrop-blur-sm border-b border-base-300">
      <div className="navbar-start">
        <div className="flex items-center gap-3">
          <div className="btn btn-circle btn-primary">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold">AI Chat Assistant</h1>
            <p className="text-xs text-base-content/50">Powered by Llama 3</p>
          </div>
        </div>
      </div>

      <div className="navbar-end gap-2">
        {/* Health check button */}
        <button
          className="btn btn-ghost btn-circle"
          onClick={onHealthCheck}
          title="Check system health"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>

        {/* Document indicator */}
        {hasDocument && (
          <div className="badge badge-success gap-2 py-3 px-4">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="max-w-24 truncate">
              {documentName || "Document"}
            </span>
            <button
              onClick={onClearDocument}
              className="hover:text-success-content/70"
              title="Remove document"
            >
              ✕
            </button>
          </div>
        )}

        {/* Clear chat button */}
        {messagesCount > 0 && (
          <button
            onClick={onClearChat}
            className="btn btn-ghost btn-circle"
            title="Clear chat"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}

        {/* Upload button */}
        <label className="cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.csv,.txt"
            onChange={onFileUpload}
            className="hidden"
            disabled={isUploading}
          />
          <span
            className={`btn ${isUploading ? "btn-disabled" : "btn-primary"}`}
          >
            {isUploading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Uploading...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Upload
              </>
            )}
          </span>
        </label>

        {/* Info tooltip */}
        <div className="dropdown dropdown-end">
          <button
            tabIndex={0}
            className="btn btn-ghost btn-circle"
            onMouseEnter={() => setShowInfoTooltip(true)}
            onMouseLeave={() => setShowInfoTooltip(false)}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
          {showInfoTooltip && (
            <div className="dropdown-content card card-compact bg-base-200 shadow-xl w-64 p-2 z-50">
              <div className="card-body">
                <h3 className="card-title text-sm">Supported Files</h3>
                <p className="text-xs text-base-content/70">
                  Upload <span className="text-primary">PDF</span>,{" "}
                  <span className="text-primary">CSV</span>, or{" "}
                  <span className="text-primary">TXT</span> files.
                </p>
                <p className="text-xs text-base-content/50">
                  The AI will use your uploaded document as context to provide
                  more relevant answers.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
