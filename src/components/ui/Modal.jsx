import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children }) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            document.body.style.backgroundColor = ''; // Reset if needed
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl shadow-slate-900/15 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50/70">
                    <h3 className="text-xl font-extrabold text-slate-900">{title}</h3>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200/70 rounded-xl text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="p-6 max-h-[80vh] overflow-y-auto text-slate-800">
                    {children}
                </div>
            </div>
        </div>
    );
}
