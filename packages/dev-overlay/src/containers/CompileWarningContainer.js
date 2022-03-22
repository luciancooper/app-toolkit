import CompileError from '../components/CompileError';
import './CompileWarningContainer.scss';

const CompileWarningContainer = ({ warnings, highlighter, onMinimize }) => (
    <section className='compile-warnings'>
        <span
            className='minimize-button'
            onClick={onMinimize}
        />
        <header>Compiled with Warnings</header>
        <div className='error-container'>
            {warnings.map((warning) => {
                const source = warning.type === 'tsc' ? highlighter.get(warning.file) : null;
                return (
                    <CompileError
                        level='warning'
                        source={source}
                        {...warning}
                    />
                );
            })}
        </div>
    </section>
);

export default CompileWarningContainer;