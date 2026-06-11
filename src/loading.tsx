import * as React from "react";
import { setActiveMenu } from "./index";
import { UploadProgress } from "./immich";

interface LoadingScreenProps {
    progress: UploadProgress;
    controller: AbortController | null;
}

export class LoadingScreen extends React.Component<LoadingScreenProps> {
    constructor(props: LoadingScreenProps) {
        super(props);
        this.cancel = this.cancel.bind(this);
    }

    cancel(event: React.MouseEvent<HTMLAnchorElement>) {
        event.preventDefault();
        this.props.controller?.abort();
        setActiveMenu("main");
    }

    render(): React.JSX.Element {
        const { done, total } = this.props.progress;
        const counter = total > 0 ? `${done} / ${total}` : "";
        return (
            <div className="place-self-center grid grid-cols-1 grid-rows-3 m-8 gap-2">
                <h1 className="title font row-1 place-self-center">
                    Se &#xEE;ncarc&#x103; <br/> v&#x103; rug&#x103;m s&#x103; a&#x15F;tepta&#x21B;i!
                    {counter && (
                        <>
                            <br/>
                            <span className="subtext">{counter}</span>
                        </>
                    )}
                </h1>

                <div className="icon justify-self-center row-2 self-center">
                    <img src="./img/loading.svg" alt="" className="loading_anim" />
                </div>

                <a href="#" onClick={this.cancel} className="button row-3 w-full max-w-sm align-middle grid grid-rows-1 rounded-xl p-4">
                    <div className="icon justify-self-end row-1 mr-3 self-center">
                        <img src="./img/cancel.svg" alt="" className="image" />
                    </div>
                    <p className="font main-text row-1 self-center justify-self-start">Anuleaz&#x103;</p>
                </a>
            </div>
        );
    }
}