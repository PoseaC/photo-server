import * as React from "react";
import * as ReactDOM from "react-dom";
import { SuccessNotification } from "./success";
import { MainMenu } from "./mainMenu";
import { LoadingScreen } from "./loading";
import { UploadProgress, fetchShareKey, uploadFiles } from "./immich";
import {
    backgroundUploadDisabled,
    disableBackgroundUpload,
    registerUploadServiceWorker,
    requestUploadStatus,
    setUploadCallbacks,
} from "./uploadManager";

// https://html-shark.com/HTML/RomanianSymbols.htm - hex code for Romanian characters

interface IndexState {
    activeMenu: string;
    selectedFiles: File[];
    uploadProgress: UploadProgress;
    uploadController: AbortController | null;
    uploadCancellable: boolean;
}

class Index extends React.Component<{}, IndexState> {
    state: IndexState = {
        activeMenu: "main",
        selectedFiles: [],
        uploadProgress: { done: 0, total: 0, percent: 0, currentFileName: "" },
        uploadController: null,
        uploadCancellable: false,
    };

    static instance: Index | null = null;

    // Guards against re-triggering the screen transition on every progress tick
    // while resuming a background upload after a page reload.
    private resumeTriggered = false;

    constructor(props: any) {
        super(props);
        Index.instance = this;
        this.setSelectedFiles = this.setSelectedFiles.bind(this);
        this.setUploadProgress = this.setUploadProgress.bind(this);
        this.setUploadController = this.setUploadController.bind(this);
        this.setUploadCancellable = this.setUploadCancellable.bind(this);
        this.runInPageUpload = this.runInPageUpload.bind(this);
    }

    componentDidMount() {
        // All terminal upload outcomes are driven by the background worker's
        // messages so they fire even when the upload started in a previous page
        // visit. MainMenu only kicks the upload off.
        setUploadCallbacks({
            onProgress: (progress) => {
                // A progress message means the upload is live in the worker, so
                // cancelling is safe (also covers resuming after a reload).
                this.setState({ uploadProgress: progress, uploadCancellable: true });
                if (this.state.activeMenu === "main" && !this.resumeTriggered && progress.done < progress.total) {
                    this.resumeTriggered = true;
                    Index.setActiveMenu("loading");
                }
            },
            onDone: () => {
                this.resumeTriggered = false;
                this.clearSelection();
                Index.setActiveMenu("success");
            },
            onError: () => {
                this.resumeTriggered = false;
                // The background (worker) upload failed. On some devices
                // (notably Android) persisting/reading the file via IndexedDB is
                // unreliable, so rather than give up, fall back to the reliable
                // in-page uploader for the current selection and stop using the
                // worker for the rest of this session.
                const files = this.state.selectedFiles;
                if (files.length > 0 && !backgroundUploadDisabled()) {
                    disableBackgroundUpload();
                    this.runInPageUpload(files);
                    return;
                }
                this.clearSelection();
                Index.setActiveMenu("main");
                alert("\u00CEnc\u0103rcarea a e\u015Fuat. V\u0103 rug\u0103m s\u0103 \u00EEncerca\u021Bi din nou.");
            },
            onCancelled: () => {
                this.resumeTriggered = false;
                // Keep the selection so the guest can easily retry.
                Index.setActiveMenu("main");
            },
        });

        registerUploadServiceWorker().then(() => requestUploadStatus());
    }

    clearSelection() {
        this.setState({ selectedFiles: [] });
        const fileInput = document.getElementById("file-upload") as HTMLInputElement | null;
        if (fileInput) fileInput.value = "";
    }

    static setActiveMenu(menu: string) {
        const element: Element = document.querySelector('#main')!;
        element.classList.add('fade-out');

        element.addEventListener('animationend', () => {
            element.classList.remove('fade-out');
            element.classList.add('fade-in');
            Index.instance?.setState({ activeMenu: menu });

            element.addEventListener('animationend', () => {
                element.classList.remove('fade-in');
            }, { once: true });

        }, { once: true });
    }

    setSelectedFiles(files: File[]) {
        this.setState({ selectedFiles: files });
    }

    setUploadProgress(progress: UploadProgress) {
        this.setState({ uploadProgress: progress });
    }

    setUploadController(controller: AbortController | null) {
        this.setState({ uploadController: controller });
    }

    setUploadCancellable(cancellable: boolean) {
        this.setState({ uploadCancellable: cancellable });
    }

    // Fallback uploader used when the background (worker) upload fails. Reads
    // each File directly via XHR (no IndexedDB), so it is not affected by the
    // Android blob-persistence issue. Runs while the loading screen is showing.
    async runInPageUpload(files: File[]) {
        try {
            const key = await fetchShareKey();
            const controller = new AbortController();
            this.setState({ uploadController: controller, uploadCancellable: true });
            await uploadFiles(files, key, {
                onProgress: this.setUploadProgress,
                signal: controller.signal,
            });
            this.clearSelection();
            this.setState({ uploadController: null });
            Index.setActiveMenu("success");
        } catch (error) {
            this.setState({ uploadController: null });
            if ((error as Error).name === "AbortError") {
                Index.setActiveMenu("main");
                return;
            }
            console.error(error);
            this.clearSelection();
            Index.setActiveMenu("main");
            alert("\u00CEnc\u0103rcarea a e\u015Fuat. V\u0103 rug\u0103m s\u0103 \u00EEncerca\u021Bi din nou.");
        }
    }

    render(): React.ReactNode {
        const { activeMenu, selectedFiles, uploadProgress, uploadController, uploadCancellable } = this.state;
        return (
            <div className="grid grid-cols-1 place-items-center mx-4">
                {activeMenu === "main" && (
                    <MainMenu
                        selectedFiles={selectedFiles}
                        setSelectedFiles={this.setSelectedFiles}
                        setUploadProgress={this.setUploadProgress}
                        setUploadController={this.setUploadController}
                        setUploadCancellable={this.setUploadCancellable}
                    />
                )}
                {activeMenu === "loading" && (
                    <LoadingScreen
                        progress={uploadProgress}
                        controller={uploadController}
                        cancellable={uploadCancellable}
                    />
                )}
                {activeMenu === "success" && <SuccessNotification />}
            </div>
        );
    }
}
export const setActiveMenu = Index.setActiveMenu;

window.addEventListener("DOMContentLoaded", async () => {
    ReactDOM.render(
        <Index />,
        document.getElementById("main")
    );
});