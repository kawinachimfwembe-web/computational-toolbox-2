document.addEventListener('DOMContentLoaded', () => {

    // ==================== PERIODIC TABLE DATA ==================== 
    const periodicTable = {
        H: 1.008, He: 4.003, Li: 6.94, Be: 9.012, B: 10.81, C: 12.011, N: 14.007,
        O: 15.999, F: 18.998, Ne: 20.180, Na: 22.990, Mg: 24.305, Al: 26.982,
        Si: 28.085, P: 30.974, S: 32.06, Cl: 35.45, Ar: 39.948, K: 39.098,
        Ca: 40.078, Sc: 44.956, Ti: 47.867, V: 50.942, Cr: 51.996, Mn: 54.938,
        Fe: 55.845, Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38, Ga: 69.723,
        Ge: 72.630, As: 74.922, Se: 78.971, Br: 79.904, Kr: 83.798, Rb: 85.468,
        Sr: 87.62, Y: 88.906, Zr: 91.224, Nb: 92.906, Mo: 95.95, Ru: 101.07,
        Rh: 102.906, Pd: 106.42, Ag: 107.868, Cd: 112.414, In: 114.818, Sn: 118.710,
        Sb: 121.760, Te: 127.60, I: 126.904, Xe: 131.293, Cs: 132.905, Ba: 137.327,
        La: 138.905, Ce: 140.116, Pr: 140.908, Nd: 144.242, Sm: 150.36, Eu: 151.964,
        Gd: 157.25, Tb: 158.925, Dy: 162.500, Ho: 164.930, Er: 167.259, Tm: 168.934,
        Yb: 173.054, Lu: 174.967, Hf: 178.49, Ta: 180.948, W: 183.84, Re: 186.207,
        Os: 190.23, Ir: 192.217, Pt: 195.084, Au: 196.967, Hg: 200.592, Tl: 204.38,
        Pb: 207.2, Bi: 208.980, Th: 232.038, Pa: 231.036, U: 238.029
    };

    const molarVolumeRTP = 24.0;
    const gasCompounds = ['H2', 'O2', 'N2', 'Cl2', 'F2', 'Br2', 'I2', 'CO2', 'NH3', 'HCl', 'SO2', 'NO', 'NO2', 'N2O', 'CH4', 'C2H6', 'C3H8'];

    // ==================== UTILITY FUNCTIONS ==================== 
    const parseChemicalFormula = (formula) => {
        const elements = {};
        const regex = /([A-Z][a-z]?)(\d*)/g;
        let match;
        while ((match = regex.exec(formula)) !== null) {
            const element = match[1];
            const count = match[2] ? parseInt(match[2]) : 1;
            elements[element] = (elements[element] || 0) + count;
        }
        return elements;
    };

    const calculateMolarMass = (formula) => {
        const elements = parseChemicalFormula(formula);
        let mass = 0;
        for (const [element, count] of Object.entries(elements)) {
            if (!periodicTable[element]) return null;
            mass += periodicTable[element] * count;
        }
        return mass;
    };

    const parseEquation = (equation) => {
        const [reactantsStr, productsStr] = equation.split('->').map(s => s.trim());
        if (!reactantsStr || !productsStr) return null;
        
        const parseCompounds = (str) => {
            return str.split('+').map(s => {
                const trimmed = s.trim();
                const match = trimmed.match(/^(\d*\.?\d*)\s*(.+)$/);
                const coeff = match ? (match[1] ? parseFloat(match[1]) : 1) : 1;
                const compound = match ? match[2].trim() : trimmed;
                return { compound, coeff };
            });
        };

        const reactants = parseCompounds(reactantsStr);
        const products = parseCompounds(productsStr);
        
        return { reactants, products };
    };

    const balanceEquation = (equation) => {
        const parsed = parseEquation(equation);
        if (!parsed) return null;

        const { reactants, products } = parsed;
        const allCompounds = [...reactants.map(r => r.compound), ...products.map(p => p.compound)];
        
        let coeffs = Array(reactants.length + products.length).fill(1);
        
        try {
            const reactantFormulas = reactants.map(r => parseChemicalFormula(r.compound));
            const productFormulas = products.map(p => parseChemicalFormula(p.compound));
            
            const isBalanced = (coeffs) => {
                const elementCounts = {};
                reactants.forEach((r, i) => {
                    const elements = parseChemicalFormula(r.compound);
                    Object.entries(elements).forEach(([el, cnt]) => {
                        elementCounts[el] = (elementCounts[el] || 0) + cnt * coeffs[i];
                    });
                });
                let balanced = true;
                products.forEach((p, i) => {
                    const elements = parseChemicalFormula(p.compound);
                    Object.entries(elements).forEach(([el, cnt]) => {
                        elementCounts[el] = (elementCounts[el] || 0) - cnt * coeffs[reactants.length + i];
                        if (elementCounts[el] !== 0) balanced = false;
                    });
                });
                return balanced;
            };

            const tryCoefficients = () => {
                const maxCoeff = 10;
                for (let c1 = 1; c1 <= maxCoeff; c1++) {
                    for (let c2 = 1; c2 <= maxCoeff; c2++) {
                        for (let c3 = 1; c3 <= maxCoeff; c3++) {
                            for (let c4 = 1; c4 <= maxCoeff; c4++) {
                                const testCoeffs = [c1, c2, c3, c4];
                                if (isBalanced(testCoeffs)) return testCoeffs.slice(0, coeffs.length);
                            }
                        }
                    }
                }
                return null;
            };

            const balanced = tryCoefficients();
            if (balanced) {
                coeffs = balanced;
            }
        } catch (e) {
            // Fallback to input coefficients if complex
        }

        let balancedStr = '';
        reactants.forEach((r, i) => {
            balancedStr += (coeffs[i] > 1 ? coeffs[i] : '') + r.compound;
            if (i < reactants.length - 1) balancedStr += ' + ';
        });
        balancedStr += ' → ';
        products.forEach((p, i) => {
            balancedStr += (coeffs[reactants.length + i] > 1 ? coeffs[reactants.length + i] : '') + p.compound;
            if (i < products.length - 1) balancedStr += ' + ';
        });

        return { balancedStr, reactants, products, coeffs: coeffs.slice(0, reactants.length + products.length) };
    };

    // ==================== CHEMISTRY MODULE ==================== 

    const balanceEquationBtn = document.getElementById('balance-equation-btn');
    const unbalancedInput = document.getElementById('unbalanced-equation');
    const balancedOutput = document.getElementById('balanced-equation-output');
    const balancedResult = document.getElementById('balanced-result');
    const massCalculator = document.getElementById('mass-calculator');
    const compoundSelector = document.getElementById('compound-selector');
    const calculateMassesBtn = document.getElementById('calculate-masses-btn');
    const massResults = document.getElementById('mass-results');
    const massResultsContent = document.getElementById('mass-results-content');

    let balancedEquationData = null;

    balanceEquationBtn.addEventListener('click', () => {
        const equation = unbalancedInput.value.trim();
        if (!equation) {
            alert('Please enter an equation');
            return;
        }

        const result = balanceEquation(equation);
        if (!result) {
            alert('Could not parse equation. Use format: A + B -> C + D');
            return;
        }

        balancedEquationData = result;
        balancedOutput.textContent = result.balancedStr;
        balancedResult.classList.remove('hidden');
        massCalculator.classList.remove('hidden');

        compoundSelector.innerHTML = '<option value="">-- Select --</option>';
        const allCompounds = [...result.reactants, ...result.products].map(c => c.compound);
        allCompounds.forEach(compound => {
            const option = document.createElement('option');
            option.value = compound;
            option.textContent = compound;
            compoundSelector.appendChild(option);
        });

        massResults.classList.add('hidden');
    });

    calculateMassesBtn.addEventListener('click', () => {
        if (!balancedEquationData) return;
        const selectedCompound = compoundSelector.value;
        const knownMass = parseFloat(document.getElementById('known-mass').value);

        if (!selectedCompound || isNaN(knownMass) || knownMass <= 0) {
            alert('Please select a compound and enter a valid mass');
            return;
        }

        const { reactants, products, coeffs } = balancedEquationData;
        const allCompounds = [...reactants, ...products];
        const selectedIndex = allCompounds.findIndex(c => c.compound === selectedCompound);
        
        if (selectedIndex === -1) return;

        const molarMass = calculateMolarMass(selectedCompound);
        if (!molarMass) {
            alert('Could not calculate molar mass');
            return;
        }

        const knownMoles = knownMass / molarMass;
        const selectedCoeff = coeffs[selectedIndex];
        const results = {};

        allCompounds.forEach((compound, index) => {
            const compoundCoeff = coeffs[index];
            const molarRatio = compoundCoeff / selectedCoeff;
            const compoundMoles = knownMoles * molarRatio;
            const compoundMolarMass = calculateMolarMass(compound.compound);
            const compoundMass = compoundMoles * compoundMolarMass;
            const compoundVolume = gasCompounds.includes(compound.compound) ? compoundMoles * molarVolumeRTP : null;

            results[compound.compound] = {
                mass: compoundMass,
                moles: compoundMoles,
                volume: compoundVolume
            };
        });

        massResultsContent.innerHTML = '';
        Object.entries(results).forEach(([compound, data]) => {
            const div = document.createElement('div');
            div.className = 'result-item';
            let content = `<div class="result-item-label">${compound}</div>
                <div class="result-item-value">Moles: ${data.moles.toFixed(6)} mol | Mass: ${data.mass.toFixed(4)} g`;
            if (data.volume !== null) {
                content += ` | Volume: ${data.volume.toFixed(3)} dm³`;
            }
            content += '</div>';
            div.innerHTML = content;
            massResultsContent.appendChild(div);
        });

        massResults.classList.remove('hidden');
    });

    const parseReactantEqBtn = document.getElementById('parse-reactant-eq-btn');
    const reactantEquationInput = document.getElementById('reactant-equation');
    const reactantInputsDiv = document.getElementById('reactant-inputs');
    const reactantMassInputsDiv = document.getElementById('reactant-mass-inputs');
    const findLimitingBtn = document.getElementById('find-limiting-btn');
    const limitingResults = document.getElementById('limiting-results');
    const limitingResultsContent = document.getElementById('limiting-results-content');

    let limitingEquationData = null;

    parseReactantEqBtn.addEventListener('click', () => {
        const equation = reactantEquationInput.value.trim();
        if (!equation) {
            alert('Please enter an equation');
            return;
        }

        const parsed = parseEquation(equation);
        if (!parsed) {
            alert('Could not parse equation');
            return;
        }

        limitingEquationData = parsed;
        reactantMassInputsDiv.innerHTML = '';
        parsed.reactants.forEach(r => {
            const div = document.createElement('div');
            div.className = 'form-group';
            div.innerHTML = `<label>${r.compound} mass (g):</label>
                <input type="number" class="reactant-mass-input" data-compound="${r.compound}" placeholder="Enter mass" step="0.001">`;
            reactantMassInputsDiv.appendChild(div);
        });

        reactantInputsDiv.classList.remove('hidden');
        limitingResults.classList.add('hidden');
    });

    findLimitingBtn.addEventListener('click', () => {
        if (!limitingEquationData) return;

        const inputs = Array.from(document.querySelectorAll('.reactant-mass-input'));
        const masses = {};
        let allFilled = true;

        inputs.forEach(input => {
            const mass = parseFloat(input.value);
            if (isNaN(mass) || mass <= 0) {
                allFilled = false;
            }
            masses[input.dataset.compound] = mass;
        });

        if (!allFilled) {
            alert('Please enter valid masses for all reactants');
            return;
        }

        const { reactants } = limitingEquationData;
        const reactantCoeffs = reactants.map(r => r.coeff);
        
        const coefficients = [];
        reactants.forEach((r, i) => {
            const regex = /^(\d+)?/;
            const match = reactantEquationInput.value.match(regex);
            coefficients[i] = match && match[1] ? parseInt(match[1]) : 1;
        });

        let analysisHtml = '<div class="result-item"><div class="result-item-label">Analysis:</div>';

        const moles = {};
        const molarMasses = {};
        reactants.forEach((r, i) => {
            molarMasses[r.compound] = calculateMolarMass(r.compound);
            moles[r.compound] = masses[r.compound] / molarMasses[r.compound];
        });

        const parseCoefficients = (equation) => {
            const coeffs = [];
            const parts = equation.split('->')[0].split('+');
            parts.forEach(part => {
                const match = part.trim().match(/^(\d+)?/);
                coeffs.push(match && match[1] ? parseInt(match[1]) : 1);
            });
            return coeffs;
        };

        const RMR = parseCoefficients(reactantEquationInput.value);
        let AMR = [];
        let limitingReactant = null;
        let minRatio = Infinity;

        reactants.forEach((r, i) => {
            AMR[i] = moles[r.compound];
            const ratio = moles[r.compound] / RMR[i];
            if (ratio < minRatio) {
                minRatio = ratio;
                limitingReactant = r.compound;
            }
        });

        analysisHtml += `<div class="result-item-value">
            <strong>Required Molar Ratio (RMR):</strong> ${RMR.join(' : ')}<br>
            <strong>Available Moles:</strong> ${reactants.map(r => `${r.compound}: ${moles[r.compound].toFixed(6)} mol`).join(' | ')}<br>
            <strong>Limiting Reactant:</strong> <span style="color: #ff9090;">${limitingReactant}</span><br>
        </div></div>`;

        reactants.forEach((r, i) => {
            if (r.compound !== limitingReactant) {
                const limitingMoles = moles[limitingReactant];
                const requireForLimiting = (limitingMoles * RMR[i]) / RMR[reactants.findIndex(rr => rr.compound === limitingReactant)];
                const excessMoles = AMR[i] - requireForLimiting;
                const excessMass = excessMoles * molarMasses[r.compound];
                analysisHtml += `<div class="result-item"><div class="result-item-label">Excess Reactant: ${r.compound}</div>
                    <div class="result-item-value">Excess Moles: ${excessMoles.toFixed(6)} mol<br>
                    Excess Mass: ${excessMass.toFixed(4)} g</div></div>`;
            }
        });

        limitingResultsContent.innerHTML = analysisHtml;
        limitingResults.classList.remove('hidden');
    });

    // ==================== MATHEMATICS MODULE ==================== 

    const quadAInput = document.getElementById('quad-a');
    const quadBInput = document.getElementById('quad-b');
    const quadCInput = document.getElementById('quad-c');
    const solveQuadraticBtn = document.getElementById('solve-quadratic-btn');
    const quadraticResults = document.getElementById('quadratic-results');
    const quadraticResultsContent = document.getElementById('quadratic-results-content');

    solveQuadraticBtn.addEventListener('click', () => {
        const a = parseFloat(quadAInput.value);
        const b = parseFloat(quadBInput.value);
        const c = parseFloat(quadCInput.value);

        if (isNaN(a) || isNaN(b) || isNaN(c)) {
            alert('Please enter valid coefficients');
            return;
        }

        if (a === 0) {
            alert('Coefficient a cannot be zero');
            return;
        }

        const discriminant = b * b - 4 * a * c;
        let html = '';

        if (discriminant > 0) {
            const x1 = (-b + Math.sqrt(discriminant)) / (2 * a);
            const x2 = (-b - Math.sqrt(discriminant)) / (2 * a);
            html = `<div class="result-item">
                <div class="result-item-label">Two Real Roots</div>
                <div class="result-item-value">x₁ = ${x1.toFixed(8)}<br>x₂ = ${x2.toFixed(8)}</div>
            </div>`;
        } else if (discriminant === 0) {
            const x = -b / (2 * a);
            html = `<div class="result-item">
                <div class="result-item-label">One Distinct Root</div>
                <div class="result-item-value">x = ${x.toFixed(8)}</div>
            </div>`;
        } else {
            const realPart = -b / (2 * a);
            const imaginaryPart = Math.sqrt(-discriminant) / (2 * a);
            html = `<div class="result-item">
                <div class="result-item-label">Complex Roots</div>
                <div class="result-item-value">x₁ = ${realPart.toFixed(8)} + ${imaginaryPart.toFixed(8)}i<br>x₂ = ${realPart.toFixed(8)} - ${imaginaryPart.toFixed(8)}i</div>
            </div>`;
        }

        html += `<div class="result-item">
            <div class="result-item-label">Discriminant (Δ)</div>
            <div class="result-item-value">${discriminant.toFixed(8)}</div>
        </div>`;

        quadraticResultsContent.innerHTML = html;
        quadraticResults.classList.remove('hidden');
    });

    const equationVariablesRadios = document.querySelectorAll('input[name="eq-variables"]');
    const equationsContainer = document.getElementById('equations-container');
    const solveSimultaneousBtn = document.getElementById('solve-simultaneous-btn');
    const simultaneousResults = document.getElementById('simultaneous-results');
    const simultaneousResultsContent = document.getElementById('simultaneous-results-content');

    const renderEquationInputs = (numVariables) => {
        equationsContainer.innerHTML = '';
        const variables = numVariables === 2 ? ['x', 'y'] : ['x', 'y', 'z'];
        const numEquations = numVariables;

        for (let eq = 0; eq < numEquations; eq++) {
            const eqDiv = document.createElement('div');
            eqDiv.className = 'form-group';
            eqDiv.innerHTML = `<label>Equation ${eq + 1}</label>`;
            
            const inputsDiv = document.createElement('div');
            inputsDiv.style.display = 'flex';
            inputsDiv.style.gap = '0.5rem';
            inputsDiv.style.flexWrap = 'wrap';
            inputsDiv.style.alignItems = 'center';

            for (let v = 0; v < numVariables; v++) {
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'input-field eq-coeff';
                input.style.flex = '1';
                input.style.minWidth = '60px';
                input.placeholder = `${variables[v]}`;
                input.dataset.equation = eq;
                input.dataset.variable = v;
                input.step = '0.001';
                inputsDiv.appendChild(input);

                if (v < numVariables - 1) {
                    const label = document.createElement('span');
                    label.textContent = variables[v] + ' + ';
                    label.style.color = '#a0d4ff';
                    inputsDiv.appendChild(label);
                }
            }

            const equalLabel = document.createElement('span');
            equalLabel.textContent = ' = ';
            equalLabel.style.color = '#a0d4ff';
            inputsDiv.appendChild(equalLabel);

            const constantInput = document.createElement('input');
            constantInput.type = 'number';
            constantInput.className = 'input-field eq-const';
            constantInput.style.flex = '1';
            constantInput.style.minWidth = '60px';
            constantInput.placeholder = 'Result';
            constantInput.dataset.equation = eq;
            constantInput.step = '0.001';
            inputsDiv.appendChild(constantInput);

            eqDiv.appendChild(inputsDiv);
            equationsContainer.appendChild(eqDiv);
        }
    };

    equationVariablesRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            renderEquationInputs(parseInt(e.target.value));
        });
    });

    renderEquationInputs(2);

    const determinant2x2 = (matrix) => {
        return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
    };

    const determinant3x3 = (matrix) => {
        return matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
               matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
               matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);
    };

    solveSimultaneousBtn.addEventListener('click', () => {
        const numVariables = parseInt(document.querySelector('input[name="eq-variables"]:checked').value);
        const coefficients = [];
        const constants = [];

        for (let eq = 0; eq < numVariables; eq++) {
            const eqCoeffs = [];
            for (let v = 0; v < numVariables; v++) {
                const input = document.querySelector(`.eq-coeff[data-equation="${eq}"][data-variable="${v}"]`);
                const value = parseFloat(input.value);
                if (isNaN(value)) {
                    alert(`Please enter valid coefficient for equation ${eq + 1}, variable ${v + 1}`);
                    return;
                }
                eqCoeffs.push(value);
            }
            const constInput = document.querySelector(`.eq-const[data-equation="${eq}"]`);
            const constValue = parseFloat(constInput.value);
            if (isNaN(constValue)) {
                alert(`Please enter valid constant for equation ${eq + 1}`);
                return;
            }
            coefficients.push(eqCoeffs);
            constants.push(constValue);
        }

        let D;
        if (numVariables === 2) {
            D = determinant2x2(coefficients);
        } else {
            D = determinant3x3(coefficients);
        }

        if (D === 0) {
            simultaneousResultsContent.innerHTML = '<div class="error-message">System has no unique solution (Determinant is 0).</div>';
            simultaneousResults.classList.remove('hidden');
            return;
        }

        const variables = numVariables === 2 ? ['x', 'y'] : ['x', 'y', 'z'];
        const solutions = {};

        for (let v = 0; v < numVariables; v++) {
            let modifiedMatrix = coefficients.map(row => [...row]);
            for (let eq = 0; eq < numVariables; eq++) {
                modifiedMatrix[eq][v] = constants[eq];
            }

            let Dv;
            if (numVariables === 2) {
                Dv = determinant2x2(modifiedMatrix);
            } else {
                Dv = determinant3x3(modifiedMatrix);
            }

            solutions[variables[v]] = Dv / D;
        }

        let html = '<div class="result-item"><div class="result-item-label">Solutions (Using Cramer\'s Rule)</div>';
        html += '<div class="result-item-value">';
        Object.entries(solutions).forEach(([variable, value]) => {
            html += `${variable} = ${value.toFixed(8)}<br>`;
        });
        html += `</div></div><div class="result-item"><div class="result-item-label">Main Determinant (D)</div>
            <div class="result-item-value">${D.toFixed(8)}</div></div>`;

        simultaneousResultsContent.innerHTML = html;
        simultaneousResults.classList.remove('hidden');
    });

    // ==================== KINEMATICS MODULE ==================== 

    const kinUInput = document.getElementById('kin-u');
    const kinVInput = document.getElementById('kin-v');
    const kinAInput = document.getElementById('kin-a');
    const kinSInput = document.getElementById('kin-s');
    const kinTInput = document.getElementById('kin-t');
    const solveKinematicsBtn = document.getElementById('solve-kinematics-btn');
    const kinematicsResults = document.getElementById('kinematics-results');
    const kinematicsResultsContent = document.getElementById('kinematics-results-content');

    solveKinematicsBtn.addEventListener('click', () => {
        const inputs = {
            u: kinUInput.value.trim(),
            v: kinVInput.value.trim(),
            a: kinAInput.value.trim(),
            s: kinSInput.value.trim(),
            t: kinTInput.value.trim()
        };

        const known = Object.entries(inputs)
            .filter(([key, value]) => value !== '')
            .map(([key, value]) => [key, parseFloat(value)]);

        if (known.length !== 3) {
            kinematicsResultsContent.innerHTML = '<div class="error-message">Please provide exactly 3 known variables to solve.</div>';
            kinematicsResults.classList.remove('hidden');
            return;
        }

        const values = {
            u: isNaN(parseFloat(inputs.u)) ? null : parseFloat(inputs.u),
            v: isNaN(parseFloat(inputs.v)) ? null : parseFloat(inputs.v),
            a: isNaN(parseFloat(inputs.a)) ? null : parseFloat(inputs.a),
            s: isNaN(parseFloat(inputs.s)) ? null : parseFloat(inputs.s),
            t: isNaN(parseFloat(inputs.t)) ? null : parseFloat(inputs.t)
        };

        const missing = Object.entries(values).find(([k, v]) => v === null);
        if (!missing) {
            kinematicsResultsContent.innerHTML = '<div class="error-message">Please provide exactly 3 known variables.</div>';
            kinematicsResults.classList.remove('hidden');
            return;
        }

        const missingVar = missing[0];
        let html = '<div class="result-item"><div class="result-item-label">Step-by-Step Solution</div>';

        try {
            if (missingVar === 's') {
                if (values.u !== null && values.v !== null && values.a !== null) {
                    html += `<div class="result-item-value">Using v = u + at → ${values.v} = ${values.u} + ${values.a} × t<br>`;
                    values.t = (values.v - values.u) / values.a;
                    html += `t = ${values.t.toFixed(8)} s<br>`;
                    values.s = values.u * values.t + 0.5 * values.a * values.t * values.t;
                    html += `Using s = ut + ½at² → s = ${values.s.toFixed(8)} m</div></div>`;
                }
            }
            else if (missingVar === 'v') {
                if (values.u !== null && values.a !== null && values.t !== null) {
                    html += `<div class="result-item-value">Using s = ut + ½at² → ${values.s} = ${values.u} × ${values.t} + 0.5 × ${values.a} × ${values.t}²<br>`;
                    values.v = values.u + values.a * values.t;
                    html += `Using v = u + at → v = ${values.v.toFixed(8)} m/s</div></div>`;
                } else if (values.u !== null && values.a !== null && values.s !== null) {
                    html += `<div class="result-item-value">Using v² = u² + 2as → v² = ${values.u}² + 2 × ${values.a} × ${values.s}<br>`;
                    const vSquared = values.u * values.u + 2 * values.a * values.s;
                    if (vSquared < 0) {
                        kinematicsResultsContent.innerHTML = '<div class="error-message">Physically impossible constraints: v² < 0</div>';
                        kinematicsResults.classList.remove('hidden');
                        return;
                    }
                    values.v = Math.sqrt(vSquared);
                    html += `v = ${values.v.toFixed(8)} m/s<br>`;
                    values.t = (values.v - values.u) / values.a;
                    html += `Using v = u + at → t = ${values.t.toFixed(8)} s</div></div>`;
                }
            }
            else if (missingVar === 't') {
                if (values.u !== null && values.v !== null && values.a !== null) {
                    html += `<div class="result-item-value">Using v² = u² + 2as → ${values.v}² = ${values.u}² + 2 × ${values.a} × s<br>`;
                    values.s = (values.v * values.v - values.u * values.u) / (2 * values.a);
                    html += `s = ${values.s.toFixed(8)} m<br>`;
                    values.t = (values.v - values.u) / values.a;
                    html += `Using v = u + at → t = ${values.t.toFixed(8)} s</div></div>`;
                } else if (values.u !== null && values.v !== null && values.s !== null) {
                    html += `<div class="result-item-value">Using v² = u² + 2as → a = (v² - u²) / 2s<br>`;
                    values.a = (values.v * values.v - values.u * values.u) / (2 * values.s);
                    html += `a = ${values.a.toFixed(8)} m/s²<br>`;
                    values.t = (values.v - values.u) / values.a;
                    html += `Using v = u + at → t = ${values.t.toFixed(8)} s</div></div>`;
                }
            }
            else if (missingVar === 'a') {
                if (values.u !== null && values.v !== null && values.t !== null) {
                    html += `<div class="result-item-value">Using s = ((u + v) / 2) × t<br>`;
                    values.s = ((values.u + values.v) / 2) * values.t;
                    html += `s = ${values.s.toFixed(8)} m<br>`;
                    values.a = (values.v - values.u) / values.t;
                    html += `Using a = (v - u) / t → a = ${values.a.toFixed(8)} m/s²</div></div>`;
                }
            }
            else if (missingVar === 'u') {
                if (values.v !== null && values.a !== null && values.t !== null) {
                    html += `<div class="result-item-value">Using s = vt - ½at² → s = ${values.v} × ${values.t} - 0.5 × ${values.a} × ${values.t}²<br>`;
                    values.s = values.v * values.t - 0.5 * values.a * values.t * values.t;
                    html += `s = ${values.s.toFixed(8)} m<br>`;
                    values.u = values.v - values.a * values.t;
                    html += `Using u = v - at → u = ${values.u.toFixed(8)} m/s</div></div>`;
                }
            }

            html += '<div class="result-item"><div class="result-item-label">Final Values</div><div class="result-item-value">';
            html += `u (Initial Velocity) = ${values.u.toFixed(8)} m/s<br>`;
            html += `v (Final Velocity) = ${values.v.toFixed(8)} m/s<br>`;
            html += `a (Acceleration) = ${values.a.toFixed(8)} m/s²<br>`;
            html += `s (Displacement) = ${values.s.toFixed(8)} m<br>`;
            html += `t (Time) = ${values.t.toFixed(8)} s`;
            html += '</div></div>';

            kinematicsResultsContent.innerHTML = html;
        } catch (e) {
            kinematicsResultsContent.innerHTML = '<div class="error-message">Error in calculation. Please check your inputs.</div>';
        }

        kinematicsResults.classList.remove('hidden');
    });

    // ==================== MODULE NAVIGATION ==================== 

    const navBtns = document.querySelectorAll('.nav-btn');
    const modules = document.querySelectorAll('.module');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const moduleId = btn.dataset.module;
            
            navBtns.forEach(b => b.classList.remove('active'));
            modules.forEach(m => m.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(moduleId).classList.add('active');
        });
    });

    // ==================== SUB-TAB NAVIGATION ==================== 

    const subTabBtns = document.querySelectorAll('.sub-tab-btn');
    subTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const subtabId = btn.dataset.subtab;
            const parentModule = btn.closest('.module-header').parentElement;
            
            const subTabs = parentModule.querySelectorAll('.sub-tab-content');
            const buttons = parentModule.querySelectorAll('.sub-tab-btn');

            buttons.forEach(b => b.classList.remove('active'));
            subTabs.forEach(tab => tab.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(subtabId).classList.add('active');
        });
    });

});
