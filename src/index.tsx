import * as React from "react";
import * as ReactDOM from "react-dom";
import { SuccessNotification } from "./success";
import { MainMenu } from "./mainMenu";
import { LoadingScreen } from "./loading";
import { UploadProgress } from "./immich";

// https://html-shark.com/HTML/RomanianSymbols.htm - hex code for Romanian characters

interface IndexState {
    activeMenu: string;
    selectedFiles: File[];
    uploadProgress: UploadProgress;
    uploadController: AbortController | null;
}

class Index extends React.Component<{}, IndexState> {
    state: IndexState = {
        activeMenu: "main",
        selectedFiles: [],
        uploadProgress: { done: 0, total: 0, percent: 0, currentFileName: "" },
        uploadController: null,
    };

    static instance: Index | null = null;

    constructor(props: any) {
        super(props);
        Index.instance = this;
        this.setSelectedFiles = this.setSelectedFiles.bind(this);
        this.setUploadProgress = this.setUploadProgress.bind(this);
        this.setUploadController = this.setUploadController.bind(this);
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

    render(): React.ReactNode {
        const { activeMenu, selectedFiles, uploadProgress, uploadController } = this.state;
        return (
            <div className="grid grid-cols-1 place-items-center mx-4">
                {activeMenu === "main" && (
                    <MainMenu
                        selectedFiles={selectedFiles}
                        setSelectedFiles={this.setSelectedFiles}
                        setUploadProgress={this.setUploadProgress}
                        setUploadController={this.setUploadController}
                    />
                )}
                {activeMenu === "loading" && (
                    <LoadingScreen
                        progress={uploadProgress}
                        controller={uploadController}
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