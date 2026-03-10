export const StatusBar = ({ fileName, loading }: { fileName: string, loading: boolean }) => (
    <footer className="h-6 bg-gray-100 border-t flex items-center px-3 text-[10px] text-gray-500 justify-between">
        <div>{loading ? `Загрузка: ${fileName}...` : 'Готов'}</div>
        <div className="flex gap-4">
            <span>Next.js + Photino</span>
        </div>
    </footer>
);