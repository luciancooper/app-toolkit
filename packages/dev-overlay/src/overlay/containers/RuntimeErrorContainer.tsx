import type { RuntimeErrorRecord, SourceHighlighter } from '../../types';
import RuntimeError from '../components/RuntimeError';
import './RuntimeErrorContainer.scss';

interface Props {
    errors: RuntimeErrorRecord[]
    highlighter: SourceHighlighter
    onClose?: () => void
}

const RuntimeErrorContainer = ({ errors, highlighter, onClose }: Props) => {
    if (errors.length === 1) {
        const error = errors[0]!;
        return (
            <section className='runtime-errors'>
                <span
                    className='close-button'
                    onClick={onClose}
                />
                <section className='runtime-error-container'>
                    <RuntimeError record={error} highlighter={highlighter}/>
                </section>
            </section>
        );
    }
    let currentIndex = 0;
    const { length } = errors,
        errorElements = errors.map((e, i) => (
            <RuntimeError
                hidden={i !== currentIndex}
                record={e}
                highlighter={highlighter}
            />
        )) as HTMLElement[],
        errorIndexLabel = (
            <span className='error-index'>{currentIndex + 1}</span>
        ) as HTMLElement,
        [arrowLeft, arrowRight] = [
            <button
                type='button'
                className='arrow-btn left'
                disabled={currentIndex === 0}
                onClick={() => {
                    errorElements[currentIndex]!.style.display = 'none';
                    errorElements[currentIndex - 1]!.style.display = '';
                    currentIndex -= 1;
                    arrowLeft.disabled = currentIndex === 0;
                    arrowRight.disabled = false;
                    errorIndexLabel.textContent = String(currentIndex + 1);
                }}
            />,
            <button
                type='button'
                className='arrow-btn right'
                disabled={currentIndex === length - 1}
                onClick={() => {
                    errorElements[currentIndex]!.style.display = 'none';
                    errorElements[currentIndex + 1]!.style.display = '';
                    currentIndex += 1;
                    arrowLeft.disabled = false;
                    arrowRight.disabled = currentIndex === length - 1;
                    errorIndexLabel.textContent = String(currentIndex + 1);
                }}
            />,
        ] as [HTMLButtonElement, HTMLButtonElement];

    return (
        <section className='runtime-errors'>
            <span className='close-button' onClick={onClose}/>
            <div className='runtime-errors-header'>
                <div className='error-pagination'>
                    {arrowLeft}
                    <span className='error-page-label'>
                        {errorIndexLabel}
                        {` of ${length}`}
                    </span>
                    {arrowRight}
                </div>
            </div>
            <section className='runtime-error-container'>
                {errorElements}
            </section>
        </section>
    );
};

export default RuntimeErrorContainer;