import type { ErrorData } from '@lcooper/webpack-messages';
import type { SourceHighlighter } from '../../types';
import CompileError from '../components/CompileError';
import './CompileWarningContainer.scss';

interface Props {
    warnings: ErrorData[]
    highlighter: SourceHighlighter
    onMinimize?: (() => void)
}

const CompileWarningContainer = ({ warnings, highlighter, onMinimize }: Props) => (
    <section className='compile-warnings'>
        <span
            className='minimize-button'
            onClick={onMinimize}
        />
        <header>Compiled with Warnings</header>
        <div className='error-container'>
            {warnings.map((warning) => {
                const source = (warning.type === 'tsc' && warning.file) ? highlighter.get(warning.file) : null;
                return (
                    <CompileError
                        level='warning'
                        source={source}
                        error={warning}
                    />
                );
            })}
        </div>
    </section>
);

export default CompileWarningContainer;