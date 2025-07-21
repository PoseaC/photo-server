import * as React from 'react';
import * as ReactDOM from 'react-dom';

// https://html-shark.com/HTML/RomanianSymbols.htm - hex code for Romanian characters
class Menu extends React.Component {
    constructor(props: any) {
        super(props);
        this.sendPhotos = this.sendPhotos.bind(this);
        this.openGallery = this.openGallery.bind(this);
    }

    sendPhotos(event: React.MouseEvent<HTMLAnchorElement>) {
        console.log('Upload button clicked');
    }

    openGallery(event: React.MouseEvent<HTMLAnchorElement>) {
        console.log('Open gallery button clicked');
    }

    render(): React.JSX.Element {
        return (
            <div className='menu'>
                <div className="title font">
                    <h1>Alexandra & Iustin 2026</h1>
                    <h2>
                        &#xCE;nc&#x103;rca&#x21B;i poze &#x15F;i videoclipuri &#xEE;n Galeria Invita&#x21B;ilor!
                    </h2>
                </div>

                <a href="#" onClick={this.openGallery} className="button">
                    <div className="icon">
                        <img src="./img/camera_icon.png" alt="" className="camera"/>
                    </div>
                    <p className="font">Selecteaz&#x103;</p>
                </a>

                <div id="placeholder_image"></div>

                <a href="./success.html" onClick={this.openGallery} className="button">
                    <div className="icon">
                        <img src="./img/send_icon.png" alt="" className="send"/>
                    </div>
                    <p className="font">Trimite</p>
                </a>
            </div>
        );
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    ReactDOM.render(
        <Menu />,
        document.getElementById('main')
    );
});