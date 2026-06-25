import * as React from "react";
import * as ReactDOM from "react-dom";
import { SuccessNotification } from "./success";
import { MainMenu } from "./mainMenu";
import { LoadingScreen } from "./loading";
import { UploadProgress } from "./immich";

// https://html-shark.com/HTML/RomanianSymbols.htm - hex code for Romanian characters

// The page must fit any mobile screen without scrolling. This wrapper measures
// the active screen and scales it down (never up) so it always fits the visible
// viewport height, regardless of device size.
const FIT_GUTTER = 72; // #main margin (m-8 = 32px x2) plus a small safety margin

class FitToScreen extends React.Component<{ activeKey: string; children: React.ReactNode }> {
    private outer = React.createRef<HTMLDivElement>();
    private inner = React.createRef<HTMLDivElement>();
    private ro: ResizeObserver | null = null;
    private rafId = 0;

    constructor(props: { activeKey: string; children: React.ReactNode }) {
        super(props);
        this.scheduleFit = this.scheduleFit.bind(this);
    }

    componentDidMount() {
        if (typeof ResizeObserver !== "undefined" && this.inner.current) {
            this.ro = new ResizeObserver(this.scheduleFit);
            this.ro.observe(this.inner.current);
        }
        window.addEventListener("resize", this.scheduleFit);
        window.visualViewport?.addEventListener("resize", this.scheduleFit);
        this.scheduleFit();
    }

    componentDidUpdate(prevProps: { activeKey: string }) {
        if (prevProps.activeKey !== this.props.activeKey) this.scheduleFit();
    }

    componentWillUnmount() {
        this.ro?.disconnect();
        window.removeEventListener("resize", this.scheduleFit);
        window.visualViewport?.removeEventListener("resize", this.scheduleFit);
        if (this.rafId) cancelAnimationFrame(this.rafId);
    }

    scheduleFit() {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = requestAnimationFrame(() => this.fit());
    }

    fit() {
        const inner = this.inner.current;
        const outer = this.outer.current;
        if (!inner || !outer) return;

        const viewport = window.visualViewport;
        const availableHeight = (viewport ? viewport.height : window.innerHeight) - FIT_GUTTER;

        inner.style.transform = "none";
        const neededHeight = inner.offsetHeight;
        if (neededHeight === 0) return;

        const scale = Math.min(1, availableHeight / neededHeight);
        inner.style.transform = `scale(${scale})`;
        outer.style.height = `${neededHeight * scale}px`;
    }

    render(): React.ReactNode {
        return (
            <div ref={this.outer} className="fit-outer">
                <div ref={this.inner} className="fit-inner">
                    {this.props.children}
                </div>
            </div>
        );
    }
}

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
            <div className="grid grid-cols-1 place-items-center">
                <FitToScreen activeKey={activeMenu}>
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
                </FitToScreen>
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