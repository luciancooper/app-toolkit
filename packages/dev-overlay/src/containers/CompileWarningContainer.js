import CompileError from '../components/CompileError';
import './CompileWarningContainer.scss';

const CompileWarningContainer = ({ warnings, onMinimize }) => (
    <section className='compile-warnings'>
        <span
            className='minimize-button'
            onClick={onMinimize}
        />
        <header>Compiled with Warnings</header>
        <div className='error-container'>
            {warnings.map((warning) => (
                <CompileError level='warning' {...warning}/>
            ))}
        </div>
    </section>
);

export default CompileWarningContainer;