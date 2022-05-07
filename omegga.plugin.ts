import OmeggaPlugin, { OL, PS, PC, _OMEGGA_UTILS_IMPORT, WriteSaveObject} from 'omegga';
import OreData from './oredata.json';



type Config = { foo: string };

interface PlayerData {
  money:number,
  pickaxeStrength:number,
  clicksLeft:number,
  levelUpCost:number,
  lastBrickPosition:number,
  interactCooldown:boolean,
  heatSuits:number,
  radSuits:number
}

let chunkSize:number;
let loadDistance:number;
let worldWidth;
let worldSquared
let loadedChunks:any[];
let lastLoadedChunks:any[];


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
    worldWidth= 2200000;
    worldSquared= 4840000000000;
    loadDistance = 1;
    chunkSize = 640;
    chunkLoadLoop();
    //Give new players 

      Omegga
      .on('join', async player => {
        try {
          let playerData:PlayerData = await this.store.get(player.id)
          if (playerData == null) {
              playerData = {
              money:0,
              pickaxeStrength:1,
              clicksLeft:0,
              levelUpCost:50,
              lastBrickPosition:null,
              interactCooldown:false,
              heatSuits:0,
              radSuits:0
            }
            await this.store.set(player.id,playerData)
            console.log(await this.store.get(player.id))
            console.log(player.id)
          } else {
            playerData.interactCooldown = false;
            await this.store.set(player.id,playerData)
          }
        } catch (err) {
          console.error('Error giving player starting Data', err);
        }
      });
    //List to save all mined bricks to.
    var emptyBricks = new Set();



    const oreSpawnChance = 0.0125;
    const oreChanceTotal = 8;
    
    
      
    Omegga
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
        Omegga.whisper(player.name, ` Bought ${quantity} ${buyType}${s} For <color="44ff44">${price}$</>`)
        if(buyType === "Heatsuit") {
          playerData.heatSuits += quantity;
          Omegga.whisper(player.name, `You now have ${playerData.heatSuits} Heatsuits`)
        };
        if(buyType === "Radsuit") {
          playerData.radSuits += quantity;
          Omegga.whisper(player.name, `You now have ${playerData.radSuits} Radsuits`)
        };
        
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
        if(!playerData.interactCooldown) {
          const positionX:number = position[0];
          const positionY:number = position[1];
          const positionZ:number = position[2];
          const match = message.match(
            /^minebrick:(?<x>-?\w+)?$/i
          );

          playerData.interactCooldown = true;
          setTimeout(async () => {playerData.interactCooldown = false; await this.store.set(player.id,playerData)},200)
          if (match) {
            let ore = match.groups.x
            let oreTag;
            //check what type of ore, and apply the type of ore to a tag
            if (ore == "dirt") {oreTag = OreData.dirt} else
            if (ore == "lava") {oreTag = OreData.lava} else
            if (ore == "iron") {oreTag = OreData.iron} else
            if (ore == "einsteinium") {oreTag = OreData.einsteinium} else
            if (ore == "tin") {oreTag = OreData.tin} else
            if (ore == "adamantium") {oreTag = OreData.adamantium} else
            if (ore == "copper") {oreTag = OreData.copper} else
            if (ore == "mithril") {oreTag = OreData.mithril} else
            if (ore == "orichalcum") {oreTag = OreData.orichalcum}
            
            
            let oreType;
            

            //I am not familiar with JSON, I am aware this code is not efficent or readable AT ALL, but it works and Typescript gives me a headache.
            //If anybody is reading and think they can improve this code, please contact Critical Floof#0217 on discord, I would greatly appreciate the help.
              
  
              if(playerData.lastBrickPosition!= positionX+positionY*worldWidth+positionZ*worldSquared) {
                playerData.clicksLeft = oreTag.duribility
              }
              playerData.clicksLeft += -playerData.pickaxeStrength
              if(playerData.clicksLeft <= 0) {
                // Functions that are nested in the actual init() because I dont know how to get Sets to work in a global or module scope at all.
                // Deleting and storing the brick coordinates in a set
                emptyBricks.add(positionX+positionY*worldWidth+positionZ*worldSquared);
                Omegga.writeln(`Bricks.ClearRegion ${positionX} ${positionY} ${positionZ} 20 20 20`);

                // Comparing index and placing neighbour dirt 
                const publicUser = {
                  id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
                  name: 'Generator',
                };
                
                
                let oreTypeJSON;
                let brickPos = [];
              
                //Check if neighbours have been previously mined
                const x0 = positionX-40+positionY*worldWidth+positionZ*worldSquared
                const y0 = positionX+(positionY-40)*worldWidth+positionZ*worldSquared
                const z0 = positionX+positionY*worldWidth+(positionZ-40)*worldSquared
                const x1 = positionX+40+positionY*worldWidth+positionZ*worldSquared
                const y1 = positionX+(positionY+40)*worldWidth+positionZ*worldSquared
                const z1 = positionX+positionY*worldWidth+(positionZ+40)*worldSquared

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

                  // Ore randomizer !!!Please Update this
                  for(let i = 0; 6 > i; i++){
                    brickPos = []
                    //Ores that generate
                    if (Math.random() <= oreSpawnChance*10) {
                      
                      const randomOre = Math.floor(Math.random()*oreChanceTotal)

                      if (randomOre <= 1) {oreTypeJSON = OreData.lava; oreType = "lava"} else
                      if (randomOre <= 2) {oreTypeJSON = OreData.iron; oreType = "iron"} else
                      if (randomOre <= 3) {oreTypeJSON = OreData.einsteinium; oreType = "einsteinium"} else
                      if (randomOre <= 4) {oreTypeJSON = OreData.tin; oreType = "tin"} else
                      if (randomOre <= 5) {oreTypeJSON = OreData.adamantium; oreType = "adamantium"} else
                      if (randomOre <= 6) {oreTypeJSON = OreData.copper; oreType = "copper"} else
                      if (randomOre <= 7) {oreTypeJSON = OreData.mithril; oreType = "mithril"} else
                      if (randomOre <= 8) {oreTypeJSON = OreData.orichalcum; oreType = "orichalcum"} 
                      
                      
                      
                      
                    } else 
                    //What kind of dirt is shown at depth
                    {
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
                      materials: [
                        'BMC_Plastic',
                        'BMC_Metallic',
                        'BMC_Glow',
                        'BMC_Hologram',
                        'BMC_Ghost',
                        'BMC_Ghost_Fail'
                        ],
                      brick_owners: [publicUser],
                      bricks: brickPos
                        .map(({xPos:x, yPos:y, zPos:z}) => ({
                          size: [20, 20, 20],
                          color: [
                            oreTypeJSON.color.r,oreTypeJSON.color.g,oreTypeJSON.color.b,oreTypeJSON.color.a
                          ],
                          position: [x,y,z],
                          material_index:oreTypeJSON.material.material_index,
                          material_intensity:oreTypeJSON.material.material_intensity,
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
                //Check if the ore consomes a heatsuit
                if(oreTag.consumesHeatSuit) {
                  if(playerData.heatSuits <= 0) {
                    Omegga.getPlayer(player.id).kill()
                    Omegga.whisper(player.name, `<color="ff4444">It appears you've been scorched to death! You should consider buying some Heatsuits using /buy heatsuit</>`)
                  } else {
                    playerData.heatSuits += -1;
                  }
                }
                //Check if the ore consomes a radsuit
                if(oreTag.consumesRadSuit) {
                  if(playerData.radSuits <= 0) {
                    Omegga.getPlayer(player.id).kill()
                    Omegga.whisper(player.name, `<color="ff4444">It appears you've been irradiated to death! You should consider buying some Radsuits using /buy radsuit</>`)
                  } else {
                    playerData.radSuits += -1;
                  }
                }
                //Check if the ore has value
                if(oreTag.value != 0) {
                  Omegga.middlePrint(player.name,`Mined ${oreTag.name} <br><color="44ff44">Worth ${oreTag.value}$</></>`)
                  playerData.money += oreTag.value
                } else {
                  Omegga.middlePrint(player.name,`Mined ${oreTag.name}`)
                }
              } //Outside the "breaking brick" Conditional vvv
              else {
                if(oreTag.value != 0) {
                  Omegga.middlePrint(player.name,`${oreTag.name} ${playerData.clicksLeft} / ${oreTag.duribility} <br><color="44ff44">Worth ${oreTag.value}$</></>`)
                } else {
                  Omegga.middlePrint(player.name,`${oreTag.name} ${playerData.clicksLeft} / ${oreTag.duribility}`)
                }
                //Check if the ore damages without a heatsuit
                if(oreTag.consumesHeatSuit) {
                  if(playerData.heatSuits <= 0) {
                    Omegga.getPlayer(player.id).damage(1)
                  }
                }
                //Check if the ore damages without a radsuit
                if(oreTag.consumesRadSuit) {
                  if(playerData.radSuits <= 0) {
                    Omegga.getPlayer(player.id).damage(5)
                  }
                }
              }
        playerData.lastBrickPosition = positionX+positionY*worldWidth+positionZ*worldSquared
        await this.store.set(player.id,playerData)
        }
        }
        
      });
    return { registeredCommands: ['money', 'balance','bal','upgradepick','upgradepickall','helpmining','suits','buy','depth'] };
  }

  async stop() {
    // Anything that needs to be cleaned up...
  }
}
async function chunkLoadLoop() {
  setTimeout(chunkLoadLoop, 300);
loadedChunks = []
try{
  let Onlineplayers = await Omegga.getAllPlayerPositions()
  //Get All Loaded Chunk Positions
  for(let i = 0; i < Onlineplayers.length; i++){
    
    const playerObjectPos = Onlineplayers[i].pos
    let playerChunkPos = 
    (((playerObjectPos[0]+worldWidth/2+320) - (playerObjectPos[0]+worldWidth/2+320)%640)/640) + 
    (((playerObjectPos[1]+worldWidth/2+320) - (playerObjectPos[1]+worldWidth/2+320)%640)/640)*worldWidth + 
    (((playerObjectPos[2]+worldWidth/2+320) - (playerObjectPos[2]+worldWidth/2+320)%640)/640)*worldSquared;

    for(let x = -loadDistance; x <= loadDistance; x++){
      for(let y = -loadDistance; y <= loadDistance; y++){
        for(let z = -loadDistance; z <= loadDistance; z++){
          loadedChunks.push(playerChunkPos+x/*1*/+y*worldWidth/*2200000*/+z*worldSquared/*4840000000000*/)
        }
      }
    }
  }
  //Remove Duplicate values in loadedChunks
  let uniqueChunks = [];
  loadedChunks.forEach((i) => {
    if(!uniqueChunks.includes(i)) {
      uniqueChunks.push(i);
    }
  });
  loadedChunks = uniqueChunks;


  //Loading
  //When in load distance of player, Load the Chuck Savefile if it exists
  for(let i = 0; i < loadedChunks.length; i++){
    let x = (loadedChunks[i]%worldWidth) - ((worldWidth+320)/1280);
    let y = (((loadedChunks[i]%worldSquared) - (loadedChunks[i]%worldWidth) - ((worldWidth+320)/1280)*worldWidth))/worldWidth;
    let z = (((loadedChunks[i]) - (loadedChunks[i]%worldSquared) - ((worldWidth+320)/1280)*worldSquared))/worldSquared;
    if(lastLoadedChunks != undefined) {
      if(!lastLoadedChunks.includes(loadedChunks[i])){
        Omegga.writeln(`Bricks.Load "ChunkLoader/Chunk ${x} ${y} ${z}" 0 0 0 1`)
      }
    }
  }
  //Saving
  //When out of load distance of player, Save the region then clear the region
  if(lastLoadedChunks != undefined){
    for(let i = 0; i < lastLoadedChunks.length; i++){
      let x = (lastLoadedChunks[i]%worldWidth) - ((worldWidth+320)/1280);
      let y = (((lastLoadedChunks[i]%worldSquared) - (lastLoadedChunks[i]%worldWidth) - ((worldWidth+320)/1280)*worldWidth))/worldWidth;
      let z = (((lastLoadedChunks[i]) - (lastLoadedChunks[i]%worldSquared) - ((worldWidth+320)/1280)*worldSquared))/worldSquared;
      if(!loadedChunks.includes(lastLoadedChunks[i])){
          Omegga.writeln(`Bricks.SaveRegion "ChunkLoader/Chunk ${x} ${y} ${z}" ${x*640+320} ${y*640+320} ${z*640+320} 320 320 320 0`)
          Omegga.writeln(`Bricks.ClearRegion ${x*640+320} ${y*640+320} ${z*640+320} 320 320 320`)
      }
    }
  }
  } catch(err){
    console.error('Error loading chunk', err);
  }
lastLoadedChunks = loadedChunks;
}
