import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { SUPPORTED_LANGUAGES } from '../Constants'
import { useLanguage } from '../context/LanguageContext'

const LanguageModal = ({ visible, onClose}) => {
    const { selectedLanguage, changeLanguage } = useLanguage()
    const handleSelect = (code) => 
    {
        changeLanguage(code)
        onClose()
    }
    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>SELECT ANNOUNCEMENT LANGUAGE</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Feather name="x" size={20} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={SUPPORTED_LANGUAGES} keyExtractor={(item) => item.code}
                        renderItem={({item}) => 
                        {
                            const isSelected = item.code === selectedLanguage;
                            return (
                                <TouchableOpacity
                                    style={[styles.item,isSelected && styles.itemSelected]}
                                    onPress={() => handleSelect(item.code)}>
                                    <View>
                                        <Text style={[styles.itemText,isSelected && styles.itemTextSelected]}>
                                            {item.native}
                                        </Text>
                                        <Text style={styles.subText}>{item.name}</Text>
                                    </View>
                                    {isSelected && <Feather name="check" size={18} color="#0284C7" />}
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create(
{
    overlay: 
    {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'flex-end'
    },
    modalContent: 
    {
        backgroundColor: '#0F172A',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '70%',
        padding: 16,
        borderColor: '#1E293B',
        borderWidth: 1
    },
    header: 
    {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B',
        marginBottom: 8
    },
    title: 
    {
        color: '#38BDF8',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1
    },
    item: 
    {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 8,
        marginVertical: 2
    },
    itemSelected: 
    {
        backgroundColor: '#1E293B'
    },
    itemText: 
    {
        color: '#F1F5F9',
        fontSize: 14,
        fontWeight: '600'
    },
    itemTextSelected: 
    {
        color: '#38BDF8'
    },
    subText: 
    {
        color: '#64748B',
        fontSize: 10
    }
})

export default LanguageModal