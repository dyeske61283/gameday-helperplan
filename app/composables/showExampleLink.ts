export const useShowExampleLink = () => {
    const showExampleLink = useState<boolean>("showExampleLink", () => {
        if(import.meta.client) {
            const fromStorage = localStorage.getItem('showExampleLink');
            if(fromStorage) {
                return fromStorage === 'true';
            }
            return true;
        }
        return false;
    });
    
    watchEffect(() => {
        if(import.meta.client) {
            localStorage.setItem('showExampleLink', showExampleLink.value.toString());
        }
    })
    
    return showExampleLink;
}