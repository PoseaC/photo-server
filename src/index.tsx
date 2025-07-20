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
        event.preventDefault();
        console.log('Upload button clicked');
    }

    openGallery(event: React.MouseEvent<HTMLAnchorElement>) {
        event.preventDefault();
        console.log('Open gallery button clicked');
    }

    render(): React.JSX.Element {
        return (
            <div className='menu'>
                <div className="title">
                    <h1>Iustin & Alexandra 2026</h1>
                    <h2>Galeria invita&#x21B;ilor</h2>
                </div>

                <div className="button">
                    <a href="#" onClick={this.openGallery}>Selecta&#x21B;i poze/videoclipuri din galerie</a>
                </div>

                <div className="button">
                    <a href="#" onClick={this.sendPhotos}>Inc&#x103;rca&#x21B;i</a>
                </div>
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