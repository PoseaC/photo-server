import * as React from "react";
import { setActiveMenu } from "./index";
import {
    IMMICH_SHARE_URL,
    UploadProgress,
    assertImmichConfig,
    fetchShareKey,
    isSupportedFile,
    uploadFiles,
} from "./immich";
import { backgroundUploadSupported, startBackgroundUpload } from "./uploadManager";

interface MainMenuProps {
    selectedFiles: File[];
    setSelectedFiles: (files: File[]) => void;
    setUploadProgress: (progress: UploadProgress) => void;
    setUploadController: (controller: AbortController | null) => void;
}

export class MainMenu extends React.Component<MainMenuProps> {
    constructor(props: MainMenuProps) {
        super(props);
        this.startUpload = this.startUpload.bind(this);
        this.openGallery = this.openGallery.bind(this);
    }

    async startUpload(files: File[]) {
        if (files.length === 0) {
            return;
        }

        this.props.setUploadProgress({
            done: 0,
            total: files.length,
            percent: 0,
            currentFileName: "",
        });

        try {
            assertImmichConfig();
            const key = await fetchShareKey();

            // Preferred path: hand the files to the service worker so the upload
            // keeps running if the guest backgrounds the tab or closes it. The
            // completion/error/cancel transitions are driven by the worker's
            // messages (handled in Index), so we just show the loading screen.
            if (backgroundUploadSupported()) {
                const started = await startBackgroundUpload(files, key);
                if (started) {
                    this.props.setUploadController(null);
                    setActiveMenu("loading");
                    return;
                }
            }

            // Fallback: upload in the page (no service worker available).
            const controller = new AbortController();
            this.props.setUploadController(controller);
            setActiveMenu("loading");
            await uploadFiles(files, key, {
                onProgress: this.props.setUploadProgress,
                signal: controller.signal,
            });

            this.props.setSelectedFiles([]);
            this.props.setUploadController(null);
            setActiveMenu("success");
        } catch (error) {
            this.props.setUploadController(null);
            if ((error as Error).name === "AbortError") {
                setActiveMenu("main");
                return;
            }
            console.error(error);
            this.props.setSelectedFiles([]);
            const fileInput = document.getElementById("file-upload") as HTMLInputElement | null;
            if (fileInput) fileInput.value = "";
            setActiveMenu("main");
            alert("\u00CEnc\u0103rcarea a e\u015Fuat. V\u0103 rug\u0103m s\u0103 \u00EEncerca\u021Bi din nou.");
        }
    }

    openGallery(event: React.MouseEvent<HTMLAnchorElement>) {
        event.preventDefault();
        if (!IMMICH_SHARE_URL) {
            alert("Galeria nu este configurat\u0103.");
            return;
        }
        window.location.assign(IMMICH_SHARE_URL);
    }

    selectFiles(fileList: FileList | null) {
        if (!fileList || fileList.length === 0) {
            this.props.setSelectedFiles([]);
            return;
        }

        const all = Array.from(fileList);
        const accepted: File[] = [];
        const rejected: string[] = [];
        for (const file of all) {
            if (isSupportedFile(file)) accepted.push(file);
            else rejected.push(file.name);
        }

        this.props.setSelectedFiles(accepted);

        if (rejected.length > 0) {
            const list = rejected.slice(0, 5).join(", ") + (rejected.length > 5 ? ", ..." : "");
            alert(`Unele fi\u015Fiere nu sunt acceptate \u015Fi au fost ignorate:\n${list}`);
        }

        // Start uploading immediately once the user finishes selecting files.
        if (accepted.length > 0) {
            this.startUpload(accepted);
        }
    }

    render(): React.JSX.Element {
        return (
            <div className="place-self-center grid grid-cols-1 mx-2 my-3 md:m-8 md:grid-rows-4 gap-2">
                <div className="title font md:row-span-3 place-self-center grid grid-cols-1 md:grid-cols-2 grid-rows-6 md:grid-rows-2 mb-2 md:mb-4">
                    <h1 className="row-1 md:cols-1 md:self-end md:mb-2 self-center">
                        Alexandra & Iustin <br/> 5 Iulie 2026
                    </h1>
                    <img src="./img/photograph.jpg" alt="" className="row-span-4 md:row-span-2 md:row-start-1 md:cols-2 row-start-2 aspect-4/5 rounded-xl self-center justify-self-center max-w-[180px] md:max-w-[230px] object-contain w-full"/>
                    <h2 className="row-6 md:row-2 md:cols-1 md:self-start self-center">
                        &#xCE;nc&#x103;rca&#x21B;i poze &#x15F;i videoclipuri &#xEE;n <br/> Galeria Invita&#x21B;ilor!
                    </h2>
                </div>

                <div className="md:row-4 grid grid-cols-1 justify-items-center md:grid-cols-2 gap-4 mb-2 align-middle">
                    <label htmlFor="file-upload" className="button cursor-pointer w-full max-w-sm align-middle grid grid-rows-1 rounded-xl p-4">
                        <div className="icon justify-self-end row-1 mr-2 self-center">
                            <img src="./img/camera.svg" alt="" className="image"/>
                        </div>
                        <p className="font main-text pl-3 row-1 self-center justify-self-start">Selecteaz&#x103;</p>
                    </label>
                    <input type="file" id="file-upload" onChange={(event) => this.selectFiles(event.target.files)} multiple hidden accept="image/*,video/*"/>

                    <a href="#" onClick={this.openGallery} className="button w-full max-w-sm align-middle grid grid-rows-1 rounded-xl p-4">
                        <div className="icon justify-self-end row-1 mr-2 self-center">
                            <img src="./img/gallery.svg" alt="" className="image"/>
                        </div>
                        <p className="font main-text pl-3 row-1 self-center justify-self-start">Vezi Galeria</p>
                    </a>
                </div>
            </div>
        );
    }
}