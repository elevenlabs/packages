import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import {
  exampleClientTools,
  toolCategories,
  toolDocumentation
} from '../tools/ExampleClientTools';

type ToolCategory = keyof typeof toolCategories;

interface ToolResult {
  toolName: string;
  parameters: Record<string, unknown>;
  result: string;
  timestamp: number;
  category: string;
}

export default function ClientToolsScreen() {
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>('device');
  const [toolResults, setToolResults] = useState<ToolResult[]>([]);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  const handleRunTool = async (toolName: string, category: string) => {
    try {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Get parameters for the tool
      const parameters: Record<string, unknown> = {};

      // Parse input values for this tool
      Object.keys(inputValues).forEach(key => {
        if (key.startsWith(`${toolName}_`)) {
          const paramName = key.replace(`${toolName}_`, '');
          const value = inputValues[key];

          // Try to parse as number if it looks like one
          if (/^\d+(\.\d+)?$/.test(value)) {
            parameters[paramName] = parseFloat(value);
          } else if (value.toLowerCase() === 'true') {
            parameters[paramName] = true;
          } else if (value.toLowerCase() === 'false') {
            parameters[paramName] = false;
          } else {
            parameters[paramName] = value;
          }
        }
      });

      // Execute the tool
      const tool = exampleClientTools[toolName];
      if (!tool) {
        throw new Error(`Tool ${toolName} not found`);
      }

      const result = await tool(parameters);
      const formattedResult = typeof result === 'object' ? JSON.stringify(result) : String(result);

      // Add to results
      const newResult: ToolResult = {
        toolName,
        parameters,
        result: formattedResult,
        timestamp: Date.now(),
        category,
      };

      setToolResults(prev => [newResult, ...prev.slice(0, 19)]); // Keep last 20 results

      // Show success feedback
      Alert.alert('Tool Executed', `${toolName} completed successfully`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Tool Error', `${toolName} failed: ${errorMessage}`);
    }
  };

  const clearResults = () => {
    setToolResults([]);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const updateInputValue = (key: string, value: string) => {
    setInputValues(prev => ({ ...prev, [key]: value }));
  };

  const renderToolCard = (toolName: string, category: string) => {
    const documentation = toolDocumentation[category as keyof typeof toolDocumentation];
    const description = documentation?.[toolName as keyof typeof documentation] || 'No description available';

    return (
      <View key={toolName} style={styles.toolCard}>
        <View style={styles.toolHeader}>
          <Text style={styles.toolName}>{toolName}</Text>
          <TouchableOpacity
            style={styles.runButton}
            onPress={() => handleRunTool(toolName, category)}
          >
            <Icon name="play-arrow" size={20} color="#fff" />
            <Text style={styles.runButtonText}>Run</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.toolDescription}>{description}</Text>

        {/* Tool-specific parameter inputs */}
        {toolName === 'get_current_time' && (
          <View style={styles.parameterContainer}>
            <Text style={styles.parameterLabel}>Format (local, utc, iso, timestamp):</Text>
            <TextInput
              style={styles.parameterInput}
              value={inputValues[`${toolName}_format`] || ''}
              onChangeText={(text) => updateInputValue(`${toolName}_format`, text)}
              placeholder="local"
              placeholderTextColor="#999"
            />
          </View>
        )}

        {toolName === 'calculate' && (
          <View style={styles.parameterContainer}>
            <Text style={styles.parameterLabel}>Expression:</Text>
            <TextInput
              style={styles.parameterInput}
              value={inputValues[`${toolName}_expression`] || ''}
              onChangeText={(text) => updateInputValue(`${toolName}_expression`, text)}
              placeholder="2 + 2 * 3"
              placeholderTextColor="#999"
            />
          </View>
        )}

        {toolName === 'convert_units' && (
          <>
            <View style={styles.parameterContainer}>
              <Text style={styles.parameterLabel}>Value:</Text>
              <TextInput
                style={styles.parameterInput}
                value={inputValues[`${toolName}_value`] || ''}
                onChangeText={(text) => updateInputValue(`${toolName}_value`, text)}
                placeholder="100"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.parameterRow}>
              <View style={[styles.parameterContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.parameterLabel}>From:</Text>
                <TextInput
                  style={styles.parameterInput}
                  value={inputValues[`${toolName}_from`] || ''}
                  onChangeText={(text) => updateInputValue(`${toolName}_from`, text)}
                  placeholder="celsius"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={[styles.parameterContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.parameterLabel}>To:</Text>
                <TextInput
                  style={styles.parameterInput}
                  value={inputValues[`${toolName}_to`] || ''}
                  onChangeText={(text) => updateInputValue(`${toolName}_to`, text)}
                  placeholder="fahrenheit"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </>
        )}

        {toolName === 'copy_to_clipboard' && (
          <View style={styles.parameterContainer}>
            <Text style={styles.parameterLabel}>Text to copy:</Text>
            <TextInput
              style={styles.parameterInput}
              value={inputValues[`${toolName}_text`] || ''}
              onChangeText={(text) => updateInputValue(`${toolName}_text`, text)}
              placeholder="Hello from ElevenLabs!"
              placeholderTextColor="#999"
            />
          </View>
        )}

        {toolName === 'analyze_text' && (
          <View style={styles.parameterContainer}>
            <Text style={styles.parameterLabel}>Text to analyze:</Text>
            <TextInput
              style={[styles.parameterInput, styles.multilineInput]}
              value={inputValues[`${toolName}_text`] || ''}
              onChangeText={(text) => updateInputValue(`${toolName}_text`, text)}
              placeholder="Enter some text to analyze..."
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />
          </View>
        )}

        {toolName === 'trigger_haptic_feedback' && (
          <View style={styles.parameterContainer}>
            <Text style={styles.parameterLabel}>Type (light, medium, heavy, success, warning, error):</Text>
            <TextInput
              style={styles.parameterInput}
              value={inputValues[`${toolName}_type`] || ''}
              onChangeText={(text) => updateInputValue(`${toolName}_type`, text)}
              placeholder="medium"
              placeholderTextColor="#999"
            />
          </View>
        )}

        {toolName === 'generate_random_number' && (
          <>
            <View style={styles.parameterRow}>
              <View style={[styles.parameterContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.parameterLabel}>Min:</Text>
                <TextInput
                  style={styles.parameterInput}
                  value={inputValues[`${toolName}_min`] || ''}
                  onChangeText={(text) => updateInputValue(`${toolName}_min`, text)}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={[styles.parameterContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.parameterLabel}>Max:</Text>
                <TextInput
                  style={styles.parameterInput}
                  value={inputValues[`${toolName}_max`] || ''}
                  onChangeText={(text) => updateInputValue(`${toolName}_max`, text)}
                  placeholder="100"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
            <View style={styles.parameterContainer}>
              <Text style={styles.parameterLabel}>Decimals:</Text>
              <TextInput
                style={styles.parameterInput}
                value={inputValues[`${toolName}_decimals`] || ''}
                onChangeText={(text) => updateInputValue(`${toolName}_decimals`, text)}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
          </>
        )}

        {toolName === 'create_timer' && (
          <>
            <View style={styles.parameterContainer}>
              <Text style={styles.parameterLabel}>Seconds:</Text>
              <TextInput
                style={styles.parameterInput}
                value={inputValues[`${toolName}_seconds`] || ''}
                onChangeText={(text) => updateInputValue(`${toolName}_seconds`, text)}
                placeholder="10"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.parameterContainer}>
              <Text style={styles.parameterLabel}>Message:</Text>
              <TextInput
                style={styles.parameterInput}
                value={inputValues[`${toolName}_message`] || ''}
                onChangeText={(text) => updateInputValue(`${toolName}_message`, text)}
                placeholder="Timer finished!"
                placeholderTextColor="#999"
              />
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Category Tabs */}
      <ScrollView
        horizontal
        style={styles.categoryTabs}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryTabsContent}
      >
        {Object.keys(toolCategories).filter(cat => cat !== 'all').map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryTab,
              selectedCategory === category && styles.categoryTabActive,
            ]}
            onPress={() => setSelectedCategory(category as ToolCategory)}
          >
            <Text style={[
              styles.categoryTabText,
              selectedCategory === category && styles.categoryTabTextActive,
            ]}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tools Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Tools
          </Text>

          {Object.keys(toolCategories[selectedCategory]).map((toolName) =>
            renderToolCard(toolName, selectedCategory)
          )}
        </View>

        {/* Results Section */}
        <View style={styles.section}>
          <View style={styles.resultsHeader}>
            <Text style={styles.sectionTitle}>Tool Results ({toolResults.length})</Text>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearResults}
              disabled={toolResults.length === 0}
            >
              <Icon name="clear-all" size={18} color="#666" />
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>

          {toolResults.length === 0 ? (
            <View style={styles.emptyResults}>
              <Icon name="build" size={48} color="#ccc" />
              <Text style={styles.emptyResultsText}>No tool results yet</Text>
              <Text style={styles.emptyResultsSubtext}>
                Run tools above to see results here
              </Text>
            </View>
          ) : (
            toolResults.map((result, index) => (
              <View key={`${result.toolName}-${result.timestamp}`} style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultToolName}>{result.toolName}</Text>
                  <Text style={styles.resultCategory}>{result.category}</Text>
                  <Text style={styles.resultTime}>
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </Text>
                </View>

                {Object.keys(result.parameters).length > 0 && (
                  <View style={styles.resultParameters}>
                    <Text style={styles.resultParametersTitle}>Parameters:</Text>
                    <Text style={styles.resultParametersText}>
                      {JSON.stringify(result.parameters, null, 2)}
                    </Text>
                  </View>
                )}

                <View style={styles.resultContent}>
                  <Text style={styles.resultLabel}>Result:</Text>
                  <Text style={styles.resultText}>{result.result}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  categoryTabs: {
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  categoryTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#e9ecef',
  },
  categoryTabActive: {
    backgroundColor: '#007AFF',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  categoryTabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  toolCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  toolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toolName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  runButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  runButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  toolDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  parameterContainer: {
    marginBottom: 12,
  },
  parameterRow: {
    flexDirection: 'row',
  },
  parameterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  parameterInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  multilineInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  emptyResults: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyResultsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '600',
  },
  emptyResultsSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultToolName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    flex: 1,
  },
  resultCategory: {
    fontSize: 10,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  resultTime: {
    fontSize: 10,
    color: '#999',
    marginLeft: 8,
  },
  resultParameters: {
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  resultParametersTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  resultParametersText: {
    fontSize: 10,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  resultContent: {
    marginTop: 4,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  resultText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 16,
  },
});