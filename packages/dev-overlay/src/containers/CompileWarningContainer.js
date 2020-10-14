import CompileError from '../components/CompileError';
import './CompileWarningContainer.scss';

export default function CompileWarningContainer({ warnings }) {
    return (
        <section className='compile-warnings'>
            <header>Compiled with Warnings</header>
            <div className='error-container'>
                {
                    warnings.map((warning) => (
                        <CompileError level='warning' {...warning}/>
                    ))
                }
            </div>
        </section>
    );
}