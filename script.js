document.addEventListener("DOMContentLoaded", () => {
    
    // --- STANDARD COMPREHENSIVE PERIODIC TABLE REFERENCE ---
    const ATOMIC_MASSES = {
        H: 1.008, He: 4.003, Li: 6.94, Be: 9.012, B: 10.81, C: 12.011, N: 14.007, O: 15.999, F: 18.998, Ne: 20.180,
        Na: 22.990, Mg: 24.305, Al: 26.982, Si: 28.085, P: 30.974, S: 32.06, Cl: 35.45, Ar: 39.948, K: 39.098,
        Ca: 40.078, Sc: 44.956, Ti: 47.867, V: 50.942, Cr: 51.996, Mn: 54.938, Fe: 55.845, Co: 58.933, Ni: 58.693,
        Cu: 63.546, Zn: 65.38, Ga: 69.723, Ge: 72.630, As: 74.922, Se: 78.971, Br: 79.904, Kr: 83.798, Rb: 85.468,
        Sr: 87.62, Y: 88.906, Zr: 91.224, Nb: 92.906, Mo: 95.95, Ru: 101.07, Rh: 102.906, Pd: 106.42, Ag: 107.868,
        Cd: 112.414, In: 114.818, Sn: 118.710, Sb: 121.760, Te: 127.60, I: 126.904, Xe: 131.293, Cs: 132.905,
        Ba: 137.327, La: 138.905, Ce: 140.116, Pr: 140.908, Nd: 144.242, Sm: 150.36, Eu: 151.964, Gd: 157.25,
        Tb: 158.925, Dy: 162.500, Ho: 164.930, Er: 167.259, Tm: 168.934, Yb: 173.054, Lu: 174.967, Hf: 178.49,
        Ta: 180.948, W: 183.84, Re: 186.207, Os: 190.23, Ir: 192.217, Pt: 195.084, Au: 196.967, Hg: 200.592,
        Tl: 204.38, Pb: 207.2, Bi: 208.980, Th: 232.038, Pa: 231.036, U: 238.029
    };
    const GAS_RTP_VOLUME = 24.0; // dm^3 / mol

    // Cache parsed state values for the current active chemical reaction
    let CURRENT_BALANCED_REACTION = null;

    // --- TAB VIEW MANAGER CONTROLLER ---
    const bindTabControllers = (navContainerClass, activeBtnClass, hiddenViewClass) => {
        const containers = document.querySelectorAll(navContainerClass);
        containers.forEach(container => {
            container.addEventListener("click", (e) => {
                const targetBtn = e.target.closest("button");
                if (!targetBtn) return;
                
                const tabGroupId = targetBtn.dataset.tab || targetBtn.dataset.subtab;
                if (!tabGroupId) return;

                // Alternate active configurations across sibling nodes
                Array.from(container.children).forEach(btn => btn.classList.remove(activeBtnClass));
                targetBtn.classList.add(activeBtnClass);

                // Hide matching structural panels matching specific sibling cards
                const viewPanels = Array.from(container.nextElementSibling.parentElement.querySelectorAll(`:scope > .sub-tab-content, :scope > .module-card, #chemistry-module > .sub-tab-content`));
                viewPanels.forEach(panel => {
                    if (panel.id === tabGroupId) {
                        panel.classList.remove(hiddenViewClass);
                    } else if (panel.classList.contains('sub-nav') === false) {
                        const targetSiblingAttr = panel.parentElement.id === "chemistry-module" ? 'data-subtab' : 'data-tab';
                        if (container.querySelector(`[${targetSiblingAttr}="${panel.id}"]`)) {
                            panel.classList.add(hiddenViewClass);
                        }
                    }
                });
            });
        });
    };

    bindTabControllers(".main-nav", "active", "hidden");
    bindTabControllers(".sub-nav", "active", "hidden");

    // Math Matrix Switcher Sub-logic
    const simModeInputs = document.querySelectorAll('input[name="sim-mode"]');
    simModeInputs.forEach(radio => {
        radio.addEventListener("change", (e) => {
            if (e.target.value === "2var") {
                document.getElementById("inputs-2var").classList.remove("hidden");
                document.getElementById("inputs-3var").classList.add("hidden");
            } else {
                document.getElementById("inputs-2var").classList.add("hidden");
                document.getElementById("inputs-3var").classList.remove("hidden");
            }
        });
    });


    // --- CHEMISTRY ALGORITHMIC PARSING & SOLVER ENGINE ---
    
    // Parses strings like "H2O" or "Ca(OH)2" into element counts
    const parseChemicalFormula = (formulaStr) => {
        const elementReg = /([A-Z][a-z]*)(\d*)/g;
        const outMap = {};
        let parsedMatch;
        
        // Basic check for nested bracket sets
        if (formulaStr.includes('(')) {
            const bracketReg = /\(([^)]+)\)(\d*)/g;
            let replacedStr = formulaStr;
            let bracketMatch;
            while ((bracketMatch = bracketReg.exec(formulaStr)) !== null) {
                const innerElements = parseChemicalFormula(bracketMatch[1]);
                const multiplier = parseInt(bracketMatch[2] || 1, 10);
                Object.keys(innerElements).forEach(el => {
                    outMap[el] = (outMap[el] || 0) + innerElements[el] * multiplier;
                });
                replacedStr = replacedStr.replace(bracketMatch[0], '');
            }
            formulaStr = replacedStr;
        }

        while ((parsedMatch = elementReg.exec(formulaStr)) !== null) {
            const el = parsedMatch[1];
            if (!ATOMIC_MASSES[el]) throw new Error(`Unknown element symbol: ${el}`);
            const count = parseInt(parsedMatch[2] || 1, 10);
            outMap[el] = (outMap[el] || 0) + count;
        }
        return outMap;
    };

    const getMolarMass = (formulaStr) => {
        const elementCounts = parseChemicalFormula(formulaStr);
        return Object.entries(elementCounts).reduce((acc, [el, count]) => acc + (ATOMIC_MASSES[el] * count), 0);
    };

    // Helper to extract clean coefficients and formulas
    const parseReactionSide = (sideString) => {
        return sideString.split('+').map(item => {
            const cleanItem = item.trim();
            const match = cleanItem.match(/^(\d*)([A-Za-z0-9()]+)$/);
            if (!match) throw new Error("Malformed formula construct encountered.");
            return {
                coefficient: parseInt(match[1] || 1, 10),
                formula: match[2]
            };
        });
    };

    // Linear Algebra Balancing Core Engine via Nullspace Estimation Mapping
    const balanceReactionEngine = (rawEquationStr) => {
        if (!rawEquationStr.includes('->')) throw new Error("Missing reaction arrow (->)");
        const [leftSide, rightSide] = rawEquationStr.split('->');
        
        const reactants = parseReactionSide(leftSide);
        const products = parseReactionSide(rightSide);
        const allCompounds = [...reactants, ...products];

        // Track atomic indices across matrix boundaries
        const elementalSet = new Set();
        allCompounds.forEach(c => Object.keys(parseChemicalFormula(c.formula)).forEach(el => elementalSet.add(el)));
        const elementList = Array.from(elementalSet);

        // Build balancing system rows (Rows = Elements, Columns = Chemical Compounds)
        const matrix = elementList.map(el => {
            return allCompounds.map((comp, idx) => {
                const composition = parseChemicalFormula(comp.formula);
                const atomicCount = composition[el] || 0;
                return idx < reactants.length ? atomicCount : -atomicCount;
            });
        });

        // Solve vector components linearly for small systems up to coefficient bounds of 10
        const compoundCount = allCompounds.length;
        let foundCoefficients = null;

        const findNullspaceVector = (index, currentVector) => {
            if (foundCoefficients) return;
            if (index === compoundCount) {
                // Validate if current vector zero-maps every element equation row
                const satisfiesAll = matrix.every(row => 
                    row.reduce((sum, val, idx) => sum + val * currentVector[idx], 0) === 0
                );
                if (satisfiesAll) foundCoefficients = [...currentVector];
                return;
            }
            // Dynamic check ranges up to balance scaling boundary factor 12
            for (let cVal = 1; cVal <= 12; cVal++) {
                currentVector[index] = cVal;
                findNullspaceVector(index + 1, currentVector);
                if (foundCoefficients) return;
            }
        };

        findNullspaceVector(0, new Array(compoundCount).fill(1));

        if (!foundCoefficients) throw new Error("Could not compute simple integer balancing ratios automatically.");

        // Map computed scalar indexes back to distinct arrays
        const balancedReactants = reactants.map((r, i) => ({
            coeff: foundCoefficients[i], formula: r.formula, molarMass: getMolarMass(r.formula)
        }));
        const balancedProducts = products.map((p, i) => ({
            coeff: foundCoefficients[reactants.length + i], formula: p.formula, molarMass: getMolarMass(p.formula)
        }));

        return { reactants: balancedReactants, products: balancedProducts };
    };

    // --- EXECUTE CHEMISTRY UI HOOKS ---
    document.getElementById("btn-balance").addEventListener("click", () => {
        const eqInput = document.getElementById("input-equation").value;
        const outBox = document.getElementById("balance-result-box");
        const outText = document.getElementById("output-balanced-eq");
        const selectBox = document.getElementById("select-known-chem");

        try {
            if (!eqInput.trim()) throw new Error("Please type an expression first.");
            const balancedData = balanceReactionEngine(eqInput);
            CURRENT_BALANCED_REACTION = balancedData;

            // Render beautifully formatted formula string outputs
            const mapStr = arr => arr.map(item => `${item.coeff === 1 ? '' : item.coeff}${item.formula}`).join(" + ");
            outText.textContent = `${mapStr(balancedData.reactants)} ➔ ${mapStr(balancedData.products)}`;

            // Populate the variable selection menu list
            selectBox.innerHTML = "";
            [...balancedData.reactants, ...balancedData.products].forEach(item => {
                const opt = document.createElement("option");
                opt.value = item.formula;
                opt.textContent = `${item.formula} (Molar Mass: ${item.molarMass.toFixed(3)} g/mol)`;
                selectBox.appendChild(opt);
            });

            outBox.classList.remove("hidden");
        } catch (err) {
            outText.innerHTML = `<span class="error-message">Error: ${err.message}</span>`;
            outBox.classList.remove("hidden");
            document.getElementById("stoich-steps-output").innerHTML = "";
        }
    });

    document.getElementById("btn-solve-stoich").addEventListener("click", () => {
        if (!CURRENT_BALANCED_REACTION) return;
        const knownFormula = document.getElementById("select-known-chem").value;
        const knownMass = parseFloat(document.getElementById("input-known-mass").value);
        const stepsZone = document.getElementById("stoich-steps-output");
        stepsZone.innerHTML = "";

        if (isNaN(knownMass) || knownMass <= 0) {
            stepsZone.innerHTML = `<div class="error-message">Please enter a valid positive mass value.</div>`;
            return;
        }

        const allComps = [...CURRENT_BALANCED_REACTION.reactants, ...CURRENT_BALANCED_REACTION.products];
        const sourceChem = allComps.find(c => c.formula === knownFormula);
        const baseMoles = knownMass / sourceChem.molarMass;

        // Generate individual target tracking elements using pure stoichiometric arrays
        allComps.forEach(targetChem => {
            if (targetChem.formula === sourceChem.formula) return;

            const moleRatio = targetChem.coeff / sourceChem.coeff;
            const computedMoles = baseMoles * moleRatio;
            const computedMass = computedMoles * targetChem.molarMass;

            const card = document.createElement("div");
            card.className = "step-card";
            
            // Gas property check wrapper context logic
            let extraGasInfo = "";
            const isGas = ["O2", "Cl2", "H2", "N2", "CO2", "NH3", "SO2"].includes(targetChem.formula);
            if (isGas) {
                const gasVol = computedMoles * GAS_RTP_VOLUME;
                extraGasInfo = `<br><strong>Volume at RTP:</strong> ${gasVol.toFixed(3)} dm³ (liters)`;
            }

            card.innerHTML = `
                <div class="step-header">Target Substance Yield: ${targetChem.formula}</div>
                <div>Molar Ratio: ${targetChem.coeff} / ${sourceChem.coeff} = ${moleRatio.toFixed(4)}</div>
                <div>Calculated Moles: ${computedMoles.toFixed(4)} mol</div>
                <div><strong>Predicted Mass:</strong> ${computedMass.toFixed(3)} grams ${extraGasInfo}</div>
            `;
            stepsZone.appendChild(card);
        });
    });

    // Subtab 2 UI: Limiting & Excess Reactor Engine implementation
    document.getElementById("btn-find-limiting").addEventListener("click", () => {
        const inputEq = document.getElementById("input-limiting-eq").value;
        const massA = parseFloat(document.getElementById("input-mass-a").value);
        const massB = parseFloat(document.getElementById("input-mass-b").value);
        const outBox = document.getElementById("limiting-result-box");
        outBox.innerHTML = "";

        try {
            if (!inputEq.trim() || isNaN(massA) || isNaN(massB)) throw new Error("Ensure all inputs and reactions are filled.");
            const balancedData = balanceReactionEngine(inputEq);
            
            if (balancedData.reactants.length !== 2) throw new Error("Limiting subtab requires exactly 2 starting reactants.");

            const rA = balancedData.reactants[0];
            const rB = balancedData.reactants[1];

            const molesA = massA / rA.molarMass;
            const molesB = massB / rB.molarMass;

            // Core RMR vs AMR comparison architecture logic
            const RMR = rA.coeff / rB.coeff;
            const AMR = molesA / molesB;

            let limiting, excess, leftoverMass;

            if (AMR < RMR) {
                // Reactant A runs dry first
                limiting = rA;
                excess = rB;
                const molesConsumedB = molesA * (rB.coeff / rA.coeff);
                leftoverMass = (molesB - molesConsumedB) * rB.molarMass;
            } else {
                // Reactant B runs dry first
                limiting = rB;
                excess = rA;
                const molesConsumedA = molesB * (rA.coeff / rB.coeff);
                leftoverMass = (molesA - molesConsumedA) * rA.molarMass;
            }

            outBox.innerHTML = `
                <div class="step-header">Analysis Steps (AMR vs RMR Method)</div>
                <div class="step-card">
                    <p>• Moles of ${rA.formula}: ${molesA.toFixed(4)} mol (Given: ${massA}g)</p>
                    <p>• Moles of ${rB.formula}: ${molesB.toFixed(4)} mol (Given: ${massB}g)</p>
                    <p>• <strong>Required Molar Ratio (RMR)</strong> [${rA.formula}/${rB.formula}]: ${rA.coeff} / ${rB.coeff} = <strong>${RMR.toFixed(4)}</strong></p>
                    <p>• <strong>Available Molar Ratio (AMR)</strong> [${rA.formula}/${rB.formula}]: ${molesA.toFixed(4)} / ${molesB.toFixed(4)} = <strong>${AMR.toFixed(4)}</strong></p>
                </div>
                <div class="step-card" style="margin-top:0.8rem; border-color: var(--emerald);">
                    <p>🚨 <strong>Limiting Reactant:</strong> <span style="color:var(--error-red); font-weight:700;">${limiting.formula}</span></p>
                    <p>📦 <strong>Excess Reactant:</strong> ${excess.formula}</p>
                    <p>⚖️ <strong>Unreacted Excess Mass Remaining:</strong> ${leftoverMass.toFixed(3)} grams</p>
                </div>
            `;
            outBox.classList.remove("hidden");

        } catch (err) {
            outBox.innerHTML = `<span class="error-message">Error: ${err.message}</span>`;
            outBox.classList.remove("hidden");
        }
    });


    // --- MATHEMATICS EQUATION ENGINE ---

    document.getElementById("btn-solve-quadratic").addEventListener("click", () => {
        const a = parseFloat(document.getElementById("quad-a").value);
        const b = parseFloat(document.getElementById("quad-b").value);
        const c = parseFloat(document.getElementById("quad-c").value);
        const outBox = document.getElementById("quadratic-result-box");
        outBox.innerHTML = "";

        if (isNaN(a) || isNaN(b) || isNaN(c)) {
            outBox.innerHTML = `<div class="error-message">Provide all coefficients cleanly.</div>`;
            outBox.classList.remove("hidden");
            return;
        }

        if (a === 0) {
            outBox.innerHTML = `<div class="error-message">Coefficient 'a' cannot be 0 in a standard quadratic function.</div>`;
            outBox.classList.remove("hidden");
            return;
        }

        const discriminant = (b * b) - (4 * a * c);
        outBox.innerHTML = `<h4>Solution Output:</h4>`;

        if (discriminant > 0) {
            const root1 = (-b + Math.sqrt(discriminant)) / (2 * a);
            const root2 = (-b - Math.sqrt(discriminant)) / (2 * a);
            outBox.innerHTML += `<p class="highlight-text">Two Distinct Real Roots:</p>
                                 <p>x₁ = ${root1.toFixed(4)}</p><p>x₂ = ${root2.toFixed(4)}</p>`;
        } else if (discriminant === 0) {
            const root = -b / (2 * a);
            outBox.innerHTML += `<p class="highlight-text">One Repeated Real Root:</p><p>x = ${root.toFixed(4)}</p>`;
        } else {
            const realPart = -b / (2 * a);
            const imagPart = Math.sqrt(-discriminant) / (2 * a);
            outBox.innerHTML += `<p class="highlight-text">Complex / Imaginary Roots:</p>
                                 <p>x₁ = ${realPart.toFixed(4)} + ${imagPart.toFixed(4)}i</p>
                                 <p>x₂ = ${realPart.toFixed(4)} - ${imagPart.toFixed(4)}i</p>`;
        }
        outBox.classList.remove("hidden");
    });

    // Cramer's Rule Matrix Solver Engine Layout Loop-free Execution
    document.getElementById("btn-solve-simultaneous").addEventListener("click", () => {
        const mode = document.querySelector('input[name="sim-mode"]:checked').value;
        const outBox = document.getElementById("simultaneous-result-box");
        outBox.innerHTML = "";

        try {
            if (mode === "2var") {
                const a1 = parseFloat(document.getElementById("eq2-a1").value);
                const b1 = parseFloat(document.getElementById("eq2-b1").value);
                const c1 = parseFloat(document.getElementById("eq2-c1").value);
                const a2 = parseFloat(document.getElementById("eq2-a2").value);
                const b2 = parseFloat(document.getElementById("eq2-b2").value);
                const c2 = parseFloat(document.getElementById("eq2-c2").value);

                if ([a1, b1, c1, a2, b2, c2].some(isNaN)) throw new Error("Fill up all 2-variable inputs matrix inputs.");

                // Determinant Calculations 
                const D = (a1 * b2) - (b1 * a2);
                if (D === 0) throw new Error("System has no unique solution (Main Determinant D = 0).");

                const Dx = (c1 * b2) - (b1 * c2);
                const Dy = (a1 * c2) - (c1 * a2);

                outBox.innerHTML = `<h4>System Roots:</h4>
                                    <p class="highlight-text">x = ${(Dx / D).toFixed(4)}</p>
                                    <p class="highlight-text">y = ${(Dy / D).toFixed(4)}</p>`;
            } else {
                // 3 Variable Matrix Cramer computation parsing arrays
                const a1 = parseFloat(document.getElementById("eq3-a1").value);
                const b1 = parseFloat(document.getElementById("eq3-b1").value);
                const c1 = parseFloat(document.getElementById("eq3-c1").value);
                const d1 = parseFloat(document.getElementById("eq3-d1").value);

                const a2 = parseFloat(document.getElementById("eq3-a2").value);
                const b2 = parseFloat(document.getElementById("eq3-b2").value);
                const c2 = parseFloat(document.getElementById("eq3-c2").value);
                const d2 = parseFloat(document.getElementById("eq3-d2").value);

                const a3 = parseFloat(document.getElementById("eq3-a3").value);
                const b3 = parseFloat(document.getElementById("eq3-b3").value);
                const c3 = parseFloat(document.getElementById("eq3-c3").value);
                const d3 = parseFloat(document.getElementById("eq3-d3").value);

                if ([a1,b1,c1,d1,a2,b2,c2,d2,a3,b3,c3,d3].some(isNaN)) throw new Error("Fill up all 3-variable inputs matrix elements.");

                // 3x3 Determinant Expansion Formula mapping logic
                const det3x3 = (ma, mb, mc, na, nb, nc, pa, pb, pc) => {
                    return ma * (nb * pc - nc * pb) - mb * (na * pc - nc * pa) + mc * (na * pb - nb * pa);
                };

                const D = det3x3(a1, b1, c1, a2, b2, c2, a3, b3, c3);
                if (D === 0) throw new Error("System has no unique solution (Main Matrix Determinant D = 0).");

                const Dx = det3x3(d1, b1, c1, d2, b2, c2, d3, b3, c3);
                const Dy = det3x3(a1, d1, c1, a2, d2, c2, a3, d3, c3);
                const Dz = det3x3(a1, b1, d1, a2, b2, d2, a3, b3, d3);

                outBox.innerHTML = `<h4>System Roots:</h4>
                                    <p class="highlight-text">x = ${(Dx / D).toFixed(4)}</p>
                                    <p class="highlight-text">y = ${(Dy / D).toFixed(4)}</p>
                                    <p class="highlight-text">z = ${(Dz / D).toFixed(4)}</p>`;
            }
            outBox.classList.remove("hidden");
        } catch (err) {
            outBox.innerHTML = `<span class="error-message">Error: ${err.message}</span>`;
            outBox.classList.remove("hidden");
        }
    });


    // --- PHYSICS KINEMATICS ENGINE ---

    document.getElementById("btn-solve-kinematics").addEventListener("click", () => {
        const outBox = document.getElementById("kinematics-result-box");
        outBox.innerHTML = "";

        const inputElements = [
            { id: 'u', val: parseFloat(document.getElementById("kin-u").value) },
            { id: 'v', val: parseFloat(document.getElementById("kin-v").value) },
            { id: 'a', val: parseFloat(document.getElementById("kin-a").value) },
            { id: 's', val: parseFloat(document.getElementById("kin-s").value) },
            { id: 't', val: parseFloat(document.getElementById("kin-t").value) }
        ];

        // Gather metrics containing real numerical items
        const knowns = inputElements.filter(item => !isNaN(item.val));
        
        if (knowns.length !== 3) {
            outBox.innerHTML = `<span class="error-message">Error: You provided ${knowns.length} parameters. Please specify exactly 3 variables to uniquely calculate motion outputs.</span>`;
            outBox.classList.remove("hidden");
            return;
        }

        // Map data references array into an query-ready dictionary lookup
        const k = {};
        knowns.forEach(item => k[item.id] = item.val);

        try {
            // Target missing parameters variables mapped linearly using direct evaluation branches
            if (k.s === undefined) {
                // Path 1: Missing 's' -> compute using standard linear acceleration bounds
                k.s = k.t !== undefined ? (k.u !== undefined ? (k.u * k.t + 0.5 * k.a * k.t * k.t) : (k.v * k.t - 0.5 * k.a * k.t * k.t)) : ((k.v * k.v - k.u * k.u) / (2 * k.a));
            }
            if (k.v === undefined) {
                // Path 2: Missing 'v'
                if (k.t !== undefined) k.v = k.u + k.a * k.t;
                else {
                    const vSq = (k.u * k.u) + (2 * k.a * k.s);
                    if (vSq < 0) throw new Error("Imaginary roots encountered. Constraints are physically impossible.");
                    k.v = Math.sqrt(vSq);
                }
            }
            if (k.t === undefined) {
                // Path 3: Missing 't'
                if (k.a !== 0) k.t = (k.v - k.u) / k.a;
                else k.t = k.s / k.u;
            }
            if (k.a === undefined) {
                // Path 4: Missing 'a'
                k.a = (k.v - k.u) / k.t;
            }
            if (k.u === undefined) {
                // Path 5: Missing 'u'
                k.u = k.v - k.a * k.t;
            }

            // Run structural range boundaries validity sweep
            if (k.t < 0) throw new Error("Computed result yielded an impossible negative time scale framework.");

            outBox.innerHTML = `
                <h4>Motion State Solution Array:</h4>
                <div class="form-grid-kinematics">
                    <div class="step-card">Initial Velocity (u):<br><strong>${k.u.toFixed(3)} m/s</strong></div>
                    <div class="step-card">Final Velocity (v):<br><strong>${k.v.toFixed(3)} m/s</strong></div>
                    <div class="step-card">Acceleration (a):<br><strong>${k.a.toFixed(3)} m/s²</strong></div>
                    <div class="step-card">Displacement (s):<br><strong>${k.s.toFixed(3)} m</strong></div>
                    <div class="step-card">Time Interval (t):<br><strong>${k.t.toFixed(3)} s</strong></div>
                </div>
            `;
            outBox.classList.remove("hidden");

        } catch (err) {
            outBox.innerHTML = `<span class="error-message">Calculation Refused: ${err.message}</span>`;
            outBox.classList.remove("hidden");
        }
    });

});
