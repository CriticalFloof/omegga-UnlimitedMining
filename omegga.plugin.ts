import OmeggaPlugin, { OL, PS, PC, _OMEGGA_UTILS_IMPORT, WriteSaveObject} from 'omegga';
import OreData from './oredata.json';



type Config = { foo: string };

interface PlayerData {
  money:number,
  pickaxeStrength:number,
  clicksLeft:number,
  levelUpCost:number,
  lastBrickPosition:number,
  heatSuits:number,
  radSuits:number
}


export default class Plugin implements OmeggaPlugin<Config, Storage> {
  omegga: OL;
  config: PC<Config>;
  store: PS<Storage>;

  constructor(omegga: OL, config: PC<Config>, store: PS<Storage>) {
    this.omegga = omegga;
    this.config = config;
    this.store = store;
  }



   

  async init() {

    

    //Give new players 

      Omegga
      .on('join', async player => {
        try {
          const playerData = await this.store.get(player.id)
          if (playerData == null) {
            let playerData:PlayerData = {
              money:0,
              pickaxeStrength:1,
              clicksLeft:0,
              levelUpCost:50,
              lastBrickPosition:null,
              heatSuits:0,
              radSuits:0
            }
            await this.store.set(player.id,playerData)
            console.log(await this.store.get(player.id))
            console.log(player.id)
          }
        } catch (err) {
          console.error('Error giving player starting Data', err);
        }
      });
    //List to save all mined bricks to.
    var emptyBricks = new Set();



    const oreSpawnChance = 0.25;
    const oreChanceTotal = 5;
    
    
      
    Omegga
    /*
    .on('cmd:cleardata', async () => {
      this.store.wipe();
    })
    .on('cmd:test', async name => {
      const player = Omegga.getPlayer(name)
      console.log(player.id)
      
      let playerData:PlayerData = await this.store.get(player.id)

      let money = playerData.money
      money += 100;



      playerData.money = money
      
      console.log(playerData.money)
      await this.store.set(player.id,playerData)
    })
    */
    /*
    Unlimited
    Mining 
    Commands
    */
    
    .on('cmd:debuggivemoney', async name => {
      const player = Omegga.getPlayer(name)
      let playerData:PlayerData = await this.store.get(player.id)
      playerData.money += 1000000000000;
      await this.store.set(player.id,playerData)
    })

    //Checking Money
    .on('cmd:money', async name => {
      const player = Omegga.getPlayer(name)
      let playerData:PlayerData = await this.store.get(player.id)
      Omegga.whisper(player.name, `Your balance is <color="44ff44">${playerData.money}$</>`)
    })
    .on('cmd:balance', async name => {
      const player = Omegga.getPlayer(name)
      let playerData:PlayerData = await this.store.get(player.id)
      Omegga.whisper(player.name, `Your balance is <color="44ff44">${playerData.money}$</>`)
    })
    .on('cmd:bal', async name => {
      const player = Omegga.getPlayer(name)
      let playerData:PlayerData = await this.store.get(player.id)
      Omegga.whisper(player.name, `Your balance is <color="44ff44">${playerData.money}$</>`)
    })
    //Checking Suits
    .on('cmd:suits', async name => {
      const player = Omegga.getPlayer(name)
      let playerData:PlayerData = await this.store.get(player.id)
      Omegga.whisper(player.name, `You have <color="ff4444">${playerData.heatSuits} Heatsuits.</>`)
      Omegga.whisper(player.name, `You have <color="44ff44">${playerData.radSuits} Radsuits.</>`)
    })
    //Upgrade Pickaxe once
    .on('cmd:upgradepick', async name => {
      const player = Omegga.getPlayer(name)
      let playerData:PlayerData = await this.store.get(player.id)
      if(playerData.money >= playerData.levelUpCost) {
        playerData.pickaxeStrength += 1;
        playerData.money += -playerData.levelUpCost;
        if (playerData.pickaxeStrength < 5) {
          playerData.levelUpCost = 50;
        } else {
          playerData.levelUpCost = (Math.pow(playerData.pickaxeStrength, 1.3))+50
          playerData.levelUpCost = Math.floor(playerData.levelUpCost)
        }
        Omegga.whisper(player.name, `Pick upgraded to Level ${playerData.pickaxeStrength}`)
      } else {
        Omegga.whisper(player.name, `<color="ff4444">1 Upgrade Costs ${playerData.levelUpCost}. You need ${playerData.levelUpCost-playerData.money} more cash to upgrade your pickaxe!</>`)
      }
      await this.store.set(player.id,playerData)
    })
    //Upgrade Pickaxe until no money left 
    .on('cmd:upgradepickall', async name => {
      const player = Omegga.getPlayer(name)
      let playerData:PlayerData = await this.store.get(player.id)
      let upgraded:boolean = false;
      if (playerData.money >= playerData.levelUpCost) upgraded = true;
      while (playerData.money >= playerData.levelUpCost) {
        playerData.pickaxeStrength += 1;
        playerData.money += -playerData.levelUpCost;
        if (playerData.pickaxeStrength < 5) {
          playerData.levelUpCost = 50;
        } else {
          playerData.levelUpCost = (Math.pow(playerData.pickaxeStrength, 1.3))+50
          playerData.levelUpCost = Math.floor(playerData.levelUpCost)
        }
        
      } 
      if(upgraded) { 
        Omegga.whisper(player.name, `Pick upgraded to Level ${playerData.pickaxeStrength}`)
      } else {
        Omegga.whisper(player.name, `<color="ff4444">1 Upgrade Costs ${playerData.levelUpCost}. You need ${playerData.levelUpCost-playerData.money} more cash to upgrade your pickaxe!</>`)
      }
      await this.store.set(player.id,playerData)
    })
    //Shop Command
    .on('cmd:buy', async (name:string, buyType:string, amount:number) => {
      let quantity:number;
      if (amount == undefined) {quantity = 1} else {quantity = Number(amount)}
      const player = Omegga.getPlayer(name)
      let playerData:PlayerData = await this.store.get(player.id)
      let s:string;
      let buyValue:number;
      if(buyType === "heatsuit") {buyValue = 100; buyType = "Heatsuit"; s = "s";}
      if(buyType === "radsuit") {buyValue = 1000; buyType = "Radsuit"; s = "s";}
      const price = buyValue*quantity
      if(playerData.money >= price) {
        if(buyType === "Heatsuit") {playerData.heatSuits += quantity;};
        if(buyType === "Radsuit") {playerData.radSuits += quantity;};
      } else if (playerData.money <= price){
        Omegga.whisper(player.name, `<color="ff4444">${quantity} ${buyType}${s} Costs ${price}$. You have ${playerData.money}$</>`)
      } else {
        Omegga.whisper(player.name, `<color="ff4444">Item Not Found.</>`)
      }
      await this.store.set(player.id,playerData)
    })
    //Depth Check
    .on('cmd:depth', async (name)  => {
      const playerPosition = await Omegga.getPlayer(name).getPosition();
      let playerZ = playerPosition[2]/10
      let height;
      if(playerZ > 0){height = "height"} else {height = "depth"; playerZ *= -1}
      const depth = playerZ.toFixed()
      
      Omegga.whisper(name,`Your ${height} is ${depth}`)
    })
    .on('cmd:helpmining', async (name)  => {
      Omegga.whisper(name,`/upgradepick Upgrades your pickaxe once
      /upgradepickall Upgrades your pick until you're broke
      /bal /balance /money Checks your balance
      /buy (heatsuits, radsuits) Allows you to buy heat/radsuits (Doesn't serve any purpose yet)
      /depth Checks your depth.`)
    })
    /*
    Unlimited
    Mining 
    Functionality
    */
    //Mining Functionality
    
      .on('interact', async ({ player, position, message }) => {
        let playerData:PlayerData = await this.store.get(player.id)
        console.log(await this.store.get(player.id))
        
        const worldWidth= 2200000;
        const worldsquared= 4840000000000;



        const positionX:number = position[0];
        const positionY:number = position[1];
        const positionZ:number = position[2];
        const match = message.match(
          /^minebrick:(?<x>-?\w+)?$/i
        );


        
        



        //ORE DATA!!!
          if (match) {
            const ore = String(match.groups.x)



            //I am not familiar with JSON, I am aware this code is not efficent or readable AT ALL, but it works and Typescript gives me a headache.
            //If anybody is reading and think they can improve this code, please contact Critical Floof#0217 on discord, I would greatly appreciate the help.
            if (ore == "dirt") {
              
  
              if(playerData.lastBrickPosition!= positionX+positionY*worldWidth+positionZ*worldsquared) {
                playerData.clicksLeft = OreData.dirt.duribility
              }
  
              playerData.clicksLeft += -playerData.pickaxeStrength
              if(playerData.clicksLeft <= 0) {

                

                // Functions that are nested in the actual init() because I dont know how to get Sets to work in a global or module scope at all.
                // Deleting and storing the brick coordinates in a set
                emptyBricks.add(positionX+positionY*worldWidth+positionZ*worldsquared);
                Omegga.writeln(`Bricks.ClearRegion ${positionX} ${positionY} ${positionZ} 20 20 20`);

                // Comparing index and placing neighbour dirt 
                const publicUser = {
                  id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
                  name: 'Generator',
                };
                
                let oreType;
                let oreTypeJSON;
                
              
                
                  const brickPos = [];
              
                const x0 = positionX-40+positionY*worldWidth+positionZ*worldsquared
                const y0 = positionX+(positionY-40)*worldWidth+positionZ*worldsquared
                const z0 = positionX+positionY*worldWidth+(positionZ-40)*worldsquared
                const x1 = positionX+40+positionY*worldWidth+positionZ*worldsquared
                const y1 = positionX+(positionY+40)*worldWidth+positionZ*worldsquared
                const z1 = positionX+positionY*worldWidth+(positionZ+40)*worldsquared

                let x0push = true
                let y0push = true
                let z0push = true
                let x1push = true
                let y1push = true
                let z1push = true
            
                  if (emptyBricks.has(x0)){x0push = false}
                  if (emptyBricks.has(y0)){y0push = false}
                  if (emptyBricks.has(z0)){z0push = false}
                  if (emptyBricks.has(x1)){x1push = false}
                  if (emptyBricks.has(y1)){y1push = false}
                  if (emptyBricks.has(z1)){z1push = false}

                  // Ore randomizer
                  for(let i = 0; 6 > i; i++){
                    if (Math.random() <= oreSpawnChance) {
                      oreType = "iron"
                      oreTypeJSON = OreData.iron
                    } else {
                      oreType = "dirt"
                      oreTypeJSON = OreData.dirt
                    }

                    if (i == 0 && x0push) {brickPos.push({xPos:-40, yPos:0, zPos:0});}
                    if (i == 1 && y0push) {brickPos.push({xPos:0, yPos:-40, zPos:0});}
                    if (i == 2 && z0push) {brickPos.push({xPos:0, yPos:0, zPos:-40});}
                    if (i == 3 && x1push) {brickPos.push({xPos:40, yPos:0, zPos:0});}
                    if (i == 4 && y1push) {brickPos.push({xPos:0, yPos:40, zPos:0});}
                    if (i == 5 && z1push) {brickPos.push({xPos:0, yPos:0, zPos:40});}
                    const save: WriteSaveObject = {
                      author: {
                        id: publicUser.id,
                        name: 'TypeScript',
                      },
                      description: 'Noise Terrain',
                      map: 'brs-js example',
                      brick_owners: [publicUser],
                      bricks: brickPos
                        .map(({xPos:x, yPos:y, zPos:z}) => ({
                          size: [20, 20, 20],
                          color: [
                            oreTypeJSON.color.r,oreTypeJSON.color.g,oreTypeJSON.color.b,oreTypeJSON.color.a
                          ],
                          position: [x,y,z],
                          components: {
                            BCD_Interact: {
                              bPlayInteractSound: false,
                              Message: "",
                              ConsoleTag: `minebrick:${oreType}`
                              
                             }
                           }              
                        })      
                        ),
                    };
                    if (brickPos.length != 0) {
                      let inputData = {offX: positionX, offY: positionY, offZ: positionZ, quiet: true, correctPalette: true, correctCustom: false};
                      Omegga.loadSaveData(save,inputData);
                      }


                  }

                  
                  
                  
                  // Generate the 3d noise
                  //Make the code set the ore on a chance per brick instead of on the entire save
                  
                  

                // Normal stuff (You can edit this)
                Omegga.middlePrint(player.name,`Mined ${OreData.dirt.name}`)
              } else {
                Omegga.middlePrint(player.name,`${OreData.dirt.name} ${playerData.clicksLeft} / ${OreData.dirt.duribility}`)
              }
  
            }



            //LAVA!!
            if (ore == "lava") {
              if(playerData.lastBrickPosition != positionX+positionY*worldWidth+positionZ*worldsquared) {
                playerData.clicksLeft = OreData.lava.duribility
                }
    
                playerData.clicksLeft += -playerData.pickaxeStrength
                if(playerData.clicksLeft <= 0) {
                  // Functions that are nested in the actual init() because I dont know how to get Sets to work in a global or module scope at all.
                  // Deleting and storing the brick coordinates in a set
                  emptyBricks.add(positionX+positionY*worldWidth+positionZ*worldsquared);
                  Omegga.writeln(`Bricks.ClearRegion ${positionX} ${positionY} ${positionZ} 20 20 20`);
  
                  // Comparing index and placing neighbour dirt 
                  const publicUser = {
                    id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
                    name: 'Generator',
                  };
                  
                  let oreType;
                  let oreTypeJSON;
                  
                
                  
                    const brickPos = [];
                
                  const x0 = positionX-40+positionY*worldWidth+positionZ*worldsquared
                  const y0 = positionX+(positionY-40)*worldWidth+positionZ*worldsquared
                  const z0 = positionX+positionY*worldWidth+(positionZ-40)*worldsquared
                  const x1 = positionX+40+positionY*worldWidth+positionZ*worldsquared
                  const y1 = positionX+(positionY+40)*worldWidth+positionZ*worldsquared
                  const z1 = positionX+positionY*worldWidth+(positionZ+40)*worldsquared
  
                  let x0push = true
                  let y0push = true
                  let z0push = true
                  let x1push = true
                  let y1push = true
                  let z1push = true
              
                    if (emptyBricks.has(x0)){x0push = false}
                    if (emptyBricks.has(y0)){y0push = false}
                    if (emptyBricks.has(z0)){z0push = false}
                    if (emptyBricks.has(x1)){x1push = false}
                    if (emptyBricks.has(y1)){y1push = false}
                    if (emptyBricks.has(z1)){z1push = false}
  
                    // Ore randomizer
                    for(let i = 0; 6 > i; i++){
                      if (Math.random() <= oreSpawnChance) {
                        oreType = "iron"
                        oreTypeJSON = OreData.iron
                      } else {
                        oreType = "dirt"
                        oreTypeJSON = OreData.dirt
                      }
  
                      if (i == 0 && x0push) {brickPos.push({xPos:-40, yPos:0, zPos:0});}
                      if (i == 1 && y0push) {brickPos.push({xPos:0, yPos:-40, zPos:0});}
                      if (i == 2 && z0push) {brickPos.push({xPos:0, yPos:0, zPos:-40});}
                      if (i == 3 && x1push) {brickPos.push({xPos:40, yPos:0, zPos:0});}
                      if (i == 4 && y1push) {brickPos.push({xPos:0, yPos:40, zPos:0});}
                      if (i == 5 && z1push) {brickPos.push({xPos:0, yPos:0, zPos:40});}
                      const save: WriteSaveObject = {
                        author: {
                          id: publicUser.id,
                          name: 'TypeScript',
                        },
                        description: 'Noise Terrain',
                        map: 'brs-js example',
                        brick_owners: [publicUser],
                        bricks: brickPos
                          .map(({xPos:x, yPos:y, zPos:z}) => ({
                            size: [20, 20, 20],
                            color: [
                              oreTypeJSON.color.r,oreTypeJSON.color.g,oreTypeJSON.color.b,oreTypeJSON.color.a
                            ],
                            position: [x,y,z],
                            components: {
                              BCD_Interact: {
                                bPlayInteractSound: false,
                                Message: "",
                                ConsoleTag: `minebrick:${oreType}`
                                
                               }
                             }              
                          })      
                          ),
                      };
                      if (brickPos.length != 0) {
                        let inputData = {offX: positionX, offY: positionY, offZ: positionZ, quiet: true, correctPalette: true, correctCustom: false};
                        Omegga.loadSaveData(save,inputData);
                        }
  
  
                    }
                  // Normal stuff (You can edit this)
                if(playerData.heatSuits <= 0) {
                  Omegga.getPlayer(player.id).kill()
                  Omegga.whisper(player.name, `<color="ff4444">It appears you've been scorched to death! You should consider buying some Heatsuits using /buy heatsuit</>`)
                } else {
                  playerData.heatSuits += -1;
                }
              } else {
                Omegga.middlePrint(player.name,`${OreData.lava.name} ${playerData.clicksLeft} / ${OreData.lava.duribility}`)
                if(playerData.heatSuits <= 0) {
                  Omegga.getPlayer(player.id).damage(1)
                }
              }
  
            }

            if (ore == "iron") {
              if(playerData.lastBrickPosition!= positionX+positionY*worldWidth+positionZ*worldsquared) {
                playerData.clicksLeft = OreData.iron.duribility
                }
    
                playerData.clicksLeft += -playerData.pickaxeStrength
                if(playerData.clicksLeft <= 0) {
                  // Functions that are nested in the actual init() because I dont know how to get Sets to work in a global or module scope at all.
                  // Deleting and storing the brick coordinates in a set
                  emptyBricks.add(positionX+positionY*worldWidth+positionZ*worldsquared);
                  Omegga.writeln(`Bricks.ClearRegion ${positionX} ${positionY} ${positionZ} 20 20 20`);
  
                  // Comparing index and placing neighbour dirt 
                  const publicUser = {
                    id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
                    name: 'Generator',
                  };
                  
                  let oreType;
                  let oreTypeJSON;
                  
                
                  
                    const brickPos = [];
                
                  const x0 = positionX-40+positionY*worldWidth+positionZ*worldsquared
                  const y0 = positionX+(positionY-40)*worldWidth+positionZ*worldsquared
                  const z0 = positionX+positionY*worldWidth+(positionZ-40)*worldsquared
                  const x1 = positionX+40+positionY*worldWidth+positionZ*worldsquared
                  const y1 = positionX+(positionY+40)*worldWidth+positionZ*worldsquared
                  const z1 = positionX+positionY*worldWidth+(positionZ+40)*worldsquared
  
                  let x0push = true
                  let y0push = true
                  let z0push = true
                  let x1push = true
                  let y1push = true
                  let z1push = true
              
                    if (emptyBricks.has(x0)){x0push = false}
                    if (emptyBricks.has(y0)){y0push = false}
                    if (emptyBricks.has(z0)){z0push = false}
                    if (emptyBricks.has(x1)){x1push = false}
                    if (emptyBricks.has(y1)){y1push = false}
                    if (emptyBricks.has(z1)){z1push = false}
  
                    // Ore randomizer
                    for(let i = 0; 6 > i; i++){
                      if (Math.random() <= oreSpawnChance) {
                        oreType = "iron"
                        oreTypeJSON = OreData.iron
                      } else {
                        oreType = "dirt"
                        oreTypeJSON = OreData.dirt
                      }
  
                      if (i == 0 && x0push) {brickPos.push({xPos:-40, yPos:0, zPos:0});}
                      if (i == 1 && y0push) {brickPos.push({xPos:0, yPos:-40, zPos:0});}
                      if (i == 2 && z0push) {brickPos.push({xPos:0, yPos:0, zPos:-40});}
                      if (i == 3 && x1push) {brickPos.push({xPos:40, yPos:0, zPos:0});}
                      if (i == 4 && y1push) {brickPos.push({xPos:0, yPos:40, zPos:0});}
                      if (i == 5 && z1push) {brickPos.push({xPos:0, yPos:0, zPos:40});}
                      const save: WriteSaveObject = {
                        author: {
                          id: publicUser.id,
                          name: 'TypeScript',
                        },
                        description: 'Noise Terrain',
                        map: 'brs-js example',
                        brick_owners: [publicUser],
                        bricks: brickPos
                          .map(({xPos:x, yPos:y, zPos:z}) => ({
                            size: [20, 20, 20],
                            color: [
                              oreTypeJSON.color.r,oreTypeJSON.color.g,oreTypeJSON.color.b,oreTypeJSON.color.a
                            ],
                            position: [x,y,z],
                            components: {
                              BCD_Interact: {
                                bPlayInteractSound: false,
                                Message: "",
                                ConsoleTag: `minebrick:${oreType}`
                                
                               }
                             }              
                          })      
                          ),
                      };
                      if (brickPos.length != 0) {
                        let inputData = {offX: positionX, offY: positionY, offZ: positionZ, quiet: true, correctPalette: true, correctCustom: false};
                        Omegga.loadSaveData(save,inputData);
                        }
  
  
                    }

                    // Normal stuff (You can edit this)


                    Omegga.middlePrint(player.name,`Mined ${OreData.iron.name} worth ${OreData.iron.value}$`)
                    playerData.money += OreData.iron.value
                    await this.store.set(player.name, playerData)
                  } else {
                    Omegga.middlePrint(player.name,`${OreData.iron.name} ${playerData.clicksLeft} / ${OreData.iron.duribility}`)
                  }
                }

        
        

        playerData.lastBrickPosition = positionX+positionY*worldWidth+positionZ*worldsquared
        await this.store.set(player.id,playerData)
        

          // Position Debug
          /*
          if (lastBrickPositionX != null) {
            Omegga.broadcast("lastposition")
          Omegga.broadcast(`${lastBrickPositionX.toString()},${lastBrickPositionY.toString()},${lastBrickPositionZ.toString()}`)
          Omegga.broadcast("position")
          Omegga.broadcast(`${positionX.toString()},${positionY.toString()},${positionZ.toString()}`)
          }
          */
        }
      });
    


    return { registeredCommands: ['money', 'balance','bal','upgradepick','upgradepickall','helpmining','suits','buy','depth'] };
  }

  async stop() {
    // Anything that needs to be cleaned up...
  }

  async generateNeighbours(player, position, playerData, emptyBricks) {

    const positionX:number = position[0];
    const positionY:number = position[1];
    const positionZ:number = position[2];

    const oreSpawnChance = 0.25;

    const worldWidth= 2200000;
    const worldsquared= 4840000000000;

      if(playerData.lastBrickPosition!= positionX+positionY*worldWidth+positionZ*worldsquared) {
        playerData.clicksLeft = OreData.iron.duribility
        }

        playerData.clicksLeft += -playerData.pickaxeStrength
        if(playerData.clicksLeft <= 0) {
          
          // Functions that are nested in the actual init() because I dont know how to get Sets to work in a global or module scope at all.
          // Deleting and storing the brick coordinates in a set
          emptyBricks.add(positionX+positionY*worldWidth+positionZ*worldsquared);
          Omegga.writeln(`Bricks.ClearRegion ${positionX} ${positionY} ${positionZ} 20 20 20`);

          // Comparing index and placing neighbour dirt 
          const publicUser = {
            id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
            name: 'Generator',
          };
          
          let oreType;
          let oreTypeJSON;
          
        
          
            const brickPos = [];
        
          const x0 = positionX-40+positionY*worldWidth+positionZ*worldsquared
          const y0 = positionX+(positionY-40)*worldWidth+positionZ*worldsquared
          const z0 = positionX+positionY*worldWidth+(positionZ-40)*worldsquared
          const x1 = positionX+40+positionY*worldWidth+positionZ*worldsquared
          const y1 = positionX+(positionY+40)*worldWidth+positionZ*worldsquared
          const z1 = positionX+positionY*worldWidth+(positionZ+40)*worldsquared

          let x0push = true
          let y0push = true
          let z0push = true
          let x1push = true
          let y1push = true
          let z1push = true
      
            if (emptyBricks.has(x0)){x0push = false}
            if (emptyBricks.has(y0)){y0push = false}
            if (emptyBricks.has(z0)){z0push = false}
            if (emptyBricks.has(x1)){x1push = false}
            if (emptyBricks.has(y1)){y1push = false}
            if (emptyBricks.has(z1)){z1push = false}

            // Ore randomizer
            for(let i = 0; 6 > i; i++){
              if (Math.random() <= oreSpawnChance) {
                oreType = "iron"
                oreTypeJSON = OreData.iron
              } else {
                oreType = "dirt"
                oreTypeJSON = OreData.dirt
              }

              if (i == 0 && x0push) {brickPos.push({xPos:-40, yPos:0, zPos:0});}
              if (i == 1 && y0push) {brickPos.push({xPos:0, yPos:-40, zPos:0});}
              if (i == 2 && z0push) {brickPos.push({xPos:0, yPos:0, zPos:-40});}
              if (i == 3 && x1push) {brickPos.push({xPos:40, yPos:0, zPos:0});}
              if (i == 4 && y1push) {brickPos.push({xPos:0, yPos:40, zPos:0});}
              if (i == 5 && z1push) {brickPos.push({xPos:0, yPos:0, zPos:40});}
              const save: WriteSaveObject = {
                author: {
                  id: publicUser.id,
                  name: 'TypeScript',
                },
                description: 'Noise Terrain',
                map: 'brs-js example',
                brick_owners: [publicUser],
                bricks: brickPos
                  .map(({xPos:x, yPos:y, zPos:z}) => ({
                    size: [20, 20, 20],
                    color: [
                      oreTypeJSON.color.r,oreTypeJSON.color.g,oreTypeJSON.color.b,oreTypeJSON.color.a
                    ],
                    position: [x,y,z],
                    components: {
                      BCD_Interact: {
                        bPlayInteractSound: false,
                        Message: "",
                        ConsoleTag: `minebrick:${oreType}`
                        
                       }
                     }              
                  })      
                  ),
              };
              if (brickPos.length != 0) {
                let inputData = {offX: positionX, offY: positionY, offZ: positionZ, quiet: true, correctPalette: true, correctCustom: false};
                Omegga.loadSaveData(save,inputData);
                }


            }

            // Normal stuff (You can edit this)


            Omegga.middlePrint(player.name,`Mined ${OreData.iron.name} worth ${OreData.iron.value}$`)
            playerData.money += OreData.iron.value
            await this.store.set(player.name, playerData)
          } else {
            Omegga.middlePrint(player.name,`${OreData.iron.name} ${playerData.clicksLeft} / ${OreData.iron.duribility}`)
          }
        
  }
}
