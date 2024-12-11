import React, { useState, useEffect } from "react";
import axios from "axios";
import "../App.css";

function Spreadsheet() {
    const [data, setData] = useState(
        Array.from({ length: 5 }, () =>
            Array(5).fill({
                value: "",
                backgroundColor: "#ffffff",
                textColor: "#000000",
                fontWeight: "normal",
                fontStyle: "normal",
            })
        )
    );

    const [selectedRow, setSelectedRow] = useState(0);
    const [selectedColumn, setSelectedColumn] = useState(0);
    const [selectedFormat, setSelectedFormat] = useState({
        backgroundColor: "#ffffff",
        textColor: "#000000",
        fontWeight: "normal",
        fontStyle: "normal",
    });
    const [selectedCells, setSelectedCells] = useState([]);
    const [history, setHistory] = useState([]);
    const [redoStack, setRedoStack] = useState([]);

    useEffect(() => {
        axios.get('http://localhost:4000/api/cells')
            .then(response => {
                const serverData = response.data;
                const updatedData = Array.from({ length: 5 }, () =>
                    Array(5).fill({
                        value: "",
                        backgroundColor: "#ffffff",
                        textColor: "#000000",
                        fontWeight: "normal",
                        fontStyle: "normal",
                    })
                );
                serverData.forEach(cell => {
                    updatedData[cell.row][cell.column] = {
                        value: cell.value,
                        backgroundColor: cell.backgroundColor || "#ffffff",
                        textColor: cell.textColor || "#000000",
                        fontWeight: cell.fontWeight || "normal",
                        fontStyle: cell.fontStyle || "normal",
                    };
                });
                setData(updatedData);
            })
            .catch(err => console.error('Kunde inte hämta data:', err));

    }, []);

    const saveHistory = () => {
        setHistory([...history, JSON.stringify(data)]);
        setRedoStack([]);
    }

    const addRow = () => {
        saveHistory();
        const newRow = Array(data[0].length).fill({
            value: "",
            backgroundColor: "#ffffff",
            textColor: "#000000",
            fontWeight: "normal",
            fontStyle: "normal",
        });
        setData([...data, newRow]);
    };

    const addColumn = () => {
        saveHistory();
        const updatedData = data.map((row) => [
            ...row,
            {
                value: "",
                backgroundColor: "#ffffff",
                textColor: "#000000",
                fontWeight: "normal",
                fontStyle: "normal",
            },
        ]);
        setData(updatedData);
    };


    const updateCell = (rowIndex, colIndex, value) => {
        saveHistory();
        const evaluatedValue = evaluateFormula(value);
        const updatedData = data.map((row, rIdx) =>
            row.map((cell, cIdx) =>
                rIdx === rowIndex && cIdx === colIndex
                    ? { ...cell, value: evaluatedValue }
                    : cell
            )
        );
        setData(updatedData);


        axios.post('http://localhost:4000/api/cells', {
            row: rowIndex,
            column: colIndex,
            value: value,
        }).catch(err => console.error('Kunde inte spara cell:', err));
    };



    const toggleCellSelection = (rowIndex, colIndex) => {
        const cellKey = `${rowIndex}-${colIndex}`;
        setSelectedCells((prevSelected) =>
            prevSelected.includes(cellKey)
                ? prevSelected.filter((key) => key !== cellKey)
                : [...prevSelected, cellKey]
        );
    };

    const formatSelectedCells = () => {
        const updatedData = data.map((row, rIdx) =>
            row.map((cell, cIdx) => {
                const cellKey = `${rIdx}-${cIdx}`;
                return selectedCells.includes(cellKey)
                    ? { ...cell, ...selectedFormat }
                    : cell;
            })
        );
        setData(updatedData);
    };

    const removeRow = (rowIndex) => {
        const updatedData = data.filter((_, rIdx) => rIdx !== rowIndex);
        setData(updatedData);
    };

    const removeColumn = (colIndex) => {
        const updatedData = data.map((row) =>
            row.filter((_, cIdx) => cIdx !== colIndex)
        );
        setData(updatedData);
    };

   

    const calculateOperation = (operation) => {
        const values = selectedCells.map((key) => {
            const [rowIndex, colIndex] = key.split("-").map(Number);
            return parseFloat(data[rowIndex][colIndex].value) || 0;
        });

        let result;
        switch (operation) {
            case "add":
                result = values.reduce((sum, val) => sum + val, 0);
                break;
            case "subtract":
                result = values.reduce((diff, val) => diff - val);
                break;
            case "multiply":
                result = values.reduce((product, val) => product * val, 1);
                break;
            case "divide":
                result = values.reduce((quotient, val) =>
                    val === 0 ? "#DIV/0!" : quotient / val
                );
                break;
            default:
                result = "#ERROR";
        }
        alert(`Resultat: ${result}`);
    };


    const undo = () => {
        if (history.length > 0) {
            const lastState = JSON.parse(history.pop());
            setRedoStack([...redoStack, JSON.stringify(data)]);
            setData(lastState);
        }
    };

    const redo = () => {
        if (redoStack.length > 0) {
            const nextState = JSON.parse(redoStack.pop());
            setHistory([...history, JSON.stringify(data)]);
            setData(nextState);
        }
    };

    const evaluateFormula = (formula) => {
        if (formula.startsWith("=")) {
            try {
                // Ersätt cellreferenser (A1, B2 osv.) med deras värden
                const expression = formula.substring(1).replace(/[A-Z]\d+/g, (cell) => {
                    const colIndex = cell.charCodeAt(0) - 65; // Exempel: 'A' -> 0
                    const rowIndex = parseInt(cell.substring(1)) - 1; // Exempel: '1' -> 0
                    return data[rowIndex]?.[colIndex]?.value || 0; // Hämta cellens värde
                });

                // Evaluera det matematiska uttrycket
                return eval(expression); // OBS: Eval kan vara riskabelt
            } catch (e) {
                console.error("Ogiltig formel:", e);
                return "#ERROR"; // Returnera ett felvärde om något går fel
            }
        }
        return formula; // Om det inte är en formel, returnera det som det är
    };

    const exportToCSV = () => {
        const csvContent = data
            .map(row => row.map(cell => cell.value).join("."))
            .join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "spreadsheet.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const importFromCSV = (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const rows = e.target.result.splut("\n").map(row => row.split(","));
            setData(rows.map(row => row.map(value => ({ value }))));
        };
        reader.readAsText(file);
    };

    return (
        <div className="spreadsheet-container">
            <div className="controls">
                <button onClick={addRow}>Lägg till rad</button>
                <button onClick={addColumn}>Lägg till kolumn</button>
                <div>
                    <label>
                        Ta bort rad:
                        <select
                            value={selectedRow}
                            onChange={(e) => setSelectedRow(Number(e.target.value))}
                        >
                            {data.map((_, rowIndex) => (
                                <option key={rowIndex} value={rowIndex}>
                                    Rad {rowIndex + 1}
                                </option>
                            ))}
                        </select>
                        <button className="delete-button" onClick={() => removeRow(selectedRow)}>Ta bort</button>
                    </label>
                </div>
                <div>
                    <label>
                        Ta bort kolumn:
                        <select
                            value={selectedColumn}
                            onChange={(e) => setSelectedColumn(Number(e.target.value))}
                        >
                            {data[0]?.map((_, colIndex) => (
                                <option key={colIndex} value={colIndex}>
                                    Kolumn {String.fromCharCode(65 + colIndex)}
                                </option>
                            ))}
                        </select>
                        <button className="delete-button" onClick={() => removeColumn(selectedColumn)}>Ta bort</button>
                        <button onClick={exportToCSV}>Exportera till CSV</button>
                        <input type="file" accept=".csv" onChange={importFromCSV} />
                    </label>
                </div>
            </div>

            <div className="toolbar">
                <button onClick={() => calculateOperation("add")}>Addera markerade</button>
                <button onClick={() => calculateOperation("subtract")}>Subtrahera markerade</button>
                <button onClick={() => calculateOperation("multiply")}>Multiplicera markerade</button>
                <button onClick={() => calculateOperation("divide")}>Dividera markerade</button>
                <label>
                    Bakgrundsfärg:
                    <input
                        type="color"
                        value={selectedFormat.backgroundColor}
                        onChange={(e) =>
                            setSelectedFormat({ ...selectedFormat, backgroundColor: e.target.value })
                        }
                    />
                </label>
                <label>
                    Textfärg:
                    <input
                        type="color"
                        value={selectedFormat.textColor}
                        onChange={(e) =>
                            setSelectedFormat({ ...selectedFormat, textColor: e.target.value })
                        }
                    />
                </label>
                <label>
                    Fet:
                    <input
                        type="checkbox"
                        checked={selectedFormat.fontWeight === "bold"}
                        onChange={(e) =>
                            setSelectedFormat({
                                ...selectedFormat,
                                fontWeight: e.target.checked ? "bold" : "normal",
                            })
                        }
                    />
                </label>
                <label>
                    Kursiv:
                    <input
                        type="checkbox"
                        checked={selectedFormat.fontStyle === "italic"}
                        onChange={(e) =>
                            setSelectedFormat({
                                ...selectedFormat,
                                fontStyle: e.target.checked ? "italic" : "normal",
                            })
                        }
                    />
                </label>
                <button onClick={formatSelectedCells}>Formatera markerade celler</button>
                <button onClick={undo}>Ångra</button>
                <button onClick={redo}>Gör om</button>
            </div>
            <div
                className="spreadsheet" style={{
                    gridTemplateColumns: `repeat(${data[0]?.length || 0}, 100px)`,
                }}
            >
                <div className="row header-row">
                    {data[0].map((_, colIndex) => (
                        <div key={`header-${colIndex}`} className="cell header-cell">
                            {String.fromCharCode(65 + colIndex)}
                        </div>
                    ))}
                </div>
                {data.map((row, rowIndex) => (
                    <div key={rowIndex} className="row">
                        {row.map((cell, colIndex) => {
                            const cellKey = `${rowIndex}-${colIndex}`;
                            return (
                                <Cell
                                    key={cellKey}
                                    value={cell.value}
                                    style={{
                                        backgroundColor: cell.backgroundColor,
                                        color: cell.textColor,
                                        fontWeight: cell.fontWeight,
                                        fontStyle: cell.fontStyle,
                                    }}
                                    isSelected={selectedCells.includes(cellKey)}
                                    toggleSelection={() => toggleCellSelection(rowIndex, colIndex)}
                                    onChange={(value) => updateCell(rowIndex, colIndex, value)}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}

function Cell({ value, onChange, style, onClick, isSelected, toggleSelection }) {
    const [isEditing, setIsEditing] = useState(false);



    return isEditing ? (
        <input
            type="text"
            defaultValue={value}
            onBlur={(e) => {
                setIsEditing(false);
                onChange(e.target.value);
            }}
            autoFocus
        />
    ) : (
        <div
            className={`cell ${isSelected ? "selected" : ""}`}
            style={style}
            onClick={() => {
                toggleSelection();
                setIsEditing(true);

            }}
        >
            {value}
        </div>
    );
}

export default Spreadsheet;