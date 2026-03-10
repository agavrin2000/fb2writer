'use client';
import { useRef } from 'react';
import { useFB2Editor } from './editor/hooks/useFB2Editor';
import { Header } from './components/layout/header';
import { Sidebar } from './components/navigation/sidebar';
import { EditorCanvas } from './components/editor/canvas';
import { StatusBar } from './components/layout/statusbar';

export default function Page() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { 
        editor, tocTree, activeHeadingPos, isLoading, handleSave, getPhotino 
    } = useFB2Editor();

    const scrollToHeading = (pos: number) => {
        if (!editor || !scrollRef.current) return;
        editor.commands.focus(pos);
        const dom = editor.view.nodeDOM(pos) as HTMLElement;
        if (dom) {
            scrollRef.current.scrollTo({ top: dom.offsetTop - 20, behavior: 'smooth' });
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-white">
            <Header 
                editor={editor} 
                onSave={handleSave} 
                onOpen={() => getPhotino()?.sendMessage('open-file:selected')} 
            />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar tree={tocTree} onNavigate={scrollToHeading} activePos={activeHeadingPos} />
                <EditorCanvas editor={editor} ref={scrollRef} />
            </div>
            <StatusBar fileName="book.fb2" loading={isLoading} />
        </div>
    );
}
