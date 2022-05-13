import OmeggaPlugin, { OL, PS, PC, _OMEGGA_UTILS_IMPORT, WriteSaveObject} from 'omegga';
import OreData from './oredata.json';



type Config = { mineLimit:number };

interface PlayerData {
  money:number,
  pickaxeStrength:number,
  clicksLeft:number,
  levelUpCost:number,
  lastBrickPosition:number,
  interactCooldown:boolean,
  heatSuits:number,
  radSuits:number,
  commandContext:string,
  rank:number
}


let worldWidth;
let worldSquared
let isWorldGenerating:boolean;
let emptyBricks:Set<unknown>;

let oreTypeJSON:any;
let oreType:any;
let oreTag:any;

let mineLimit:number;

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
    mineLimit = this.config.mineLimit;
    

    worldWidth= 2200000;
    worldSquared= 4840000000000;

    generateWorld()

    setInterval(checkOverLimit,15000)

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
              radSuits:0,
              commandContext:"none",
              rank:0
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





    const oreSpawnChance = 0.0125;
    const oreChanceTotal = 8;
    
    
      
    Omegga
    /*
    Unlimited
    Mining 
    Commands
    */

    .on('cmd:givememoney', async (name:string, amount:number) => {
      let quantity:number = Number(amount);
      const player = Omegga.getPlayer(name)
      let playerData:PlayerData = await this.store.get(player.id)
      if(amount === undefined) {
      Omegga.whisper(player.name, `You ask for money but dont specify how much, nothing happens.`)
      return;
      }
      Omegga.whisper(player.name, `A figure from above gives you ${amount}`)
      playerData.money += quantity;
      await this.store.set(player.id,playerData)
    })

    //Context Based Commands.  Usually for serious commands that need confirmation
    .on('cmd:yes', async name => {
      const player = Omegga.getPlayer(name)
      let playerData:PlayerData = await this.store.get(player.id)

      if(playerData.commandContext === "resetmystats") {
        playerData = {
          money:0,
          pickaxeStrength:1,
          clicksLeft:0,
          levelUpCost:50,
          lastBrickPosition:null,
          interactCooldown:false,
          heatSuits:0,
          radSuits:0,
          commandContext:"none",
          rank:0
        }
        await this.store.set(player.id,playerData)
        Omegga.whisper(player.name, `Player data reset!`)
        return;
      }

      Omegga.whisper(player.name, `No Context Given.`)
    })
    .on('cmd:no', async name => {
      const player = Omegga.getPlayer(name)
      let playerData:PlayerData = await this.store.get(player.id)
      if(playerData.commandContext !== "none") {
        playerData.commandContext = "none"
        await this.store.set(player.id,playerData)
        Omegga.whisper(player.name, `Command Aborted.`)
        return;
      }
      Omegga.whisper(player.name, `No Context Given.`)
      

    })




    //RESET YOUR STATS
    .on('cmd:resetmystats', async name => {
      const player = Omegga.getPlayer(name)
      let playerData:PlayerData = await this.store.get(player.id)
      Omegga.whisper(player.name, `<size="20"><color="ff2222">Are you sure you want to reset your stats?</></>
      Type /yes to confirm. /no to cancel`)
      playerData.commandContext = "resetmystats"
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
        if(playerData.rank*100+100 <= playerData.pickaxeStrength) {
          Omegga.whisper(player.name, `You can't upgrade your pick past ${playerData.rank*100+100}! Use /rankup instead.`)
          return;
        }
        playerData.pickaxeStrength += 1;
        playerData.money += -playerData.levelUpCost;
        if (playerData.pickaxeStrength < 5) {
          playerData.levelUpCost = 50;
        } else {
          if(playerData.rank > 0) {
            playerData.levelUpCost = Math.floor(Math.pow(playerData.pickaxeStrength, 1.3))*playerData.rank
          } else{
            playerData.levelUpCost = Math.floor(Math.pow(playerData.pickaxeStrength, 1.3))+50
          }
        }
        Omegga.whisper(player.name, `Pick upgraded to Level ${playerData.pickaxeStrength}`)
      } else {
        Omegga.whisper(player.name, `<color="ff4444">1 Upgrade Costs ${playerData.levelUpCost}. You need ${playerData.levelUpCost-playerData.money} more cash to upgrade your pickaxe!</>`)
      }
      await this.store.set(player.id,playerData)
    })
    //Upgrade Pickaxe until no money left or max level
    .on('cmd:upgradepickall', async name => {
      const player = Omegga.getPlayer(name)
      let playerData:PlayerData = await this.store.get(player.id)
      let upgraded:boolean = false;
      if (playerData.money >= playerData.levelUpCost) upgraded = true;
      if(playerData.rank*100+100 <= playerData.pickaxeStrength) {
        Omegga.whisper(player.name, `You can't upgrade your pick past ${playerData.rank*100+100}! Use /rankup instead.`)
        return;
      }
      while (playerData.money >= playerData.levelUpCost) {
        playerData.pickaxeStrength += 1;
        playerData.money += -playerData.levelUpCost;
        if (playerData.pickaxeStrength < 5) {
          playerData.levelUpCost = 50;
        } else {
          if(playerData.rank > 0) {
            playerData.levelUpCost = Math.floor(Math.pow(playerData.pickaxeStrength, 1.3))*playerData.rank
          } else{
            playerData.levelUpCost = Math.floor(Math.pow(playerData.pickaxeStrength, 1.3))+50
          }
        }
        if(playerData.rank*100+100 <= playerData.pickaxeStrength) {
          break;
        }
      } 
      if(upgraded) { 
        Omegga.whisper(player.name, `Pick upgraded to Level ${playerData.pickaxeStrength}`)
      } else {
        Omegga.whisper(player.name, `<color="ff4444">1 Upgrade Costs ${playerData.levelUpCost}. You need ${playerData.levelUpCost-playerData.money} more cash to upgrade your pickaxe!</>`)
      }
      

      await this.store.set(player.id,playerData)
    })
    //Rank up
    .on('cmd:rankup', async name => {
      const player = Omegga.getPlayer(name)
      let playerData:PlayerData = await this.store.get(player.id)
      if (playerData.rank*100+100 <= playerData.pickaxeStrength) {
        playerData.rank += 1;
        playerData.pickaxeStrength = 1;
        Omegga.whisper(name,`You are now rank ${playerData.rank}.`)
        await this.store.set(player.id,playerData)
        return;
      }
      Omegga.whisper(name,`You must reach your max level (${playerData.rank*100+100}) before ranking up.`)
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
          playerData.money += -price;
          Omegga.whisper(player.name, `You now have ${playerData.heatSuits} Heatsuits`)
        };
        if(buyType === "Radsuit") {
          playerData.radSuits += quantity;
          playerData.money += -price;
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
    //help
    .on('cmd:helpmining', async (name:string, section:string, page:string)  => {
      const player = Omegga.getPlayer(name)
      console.log(section)
      if(section == undefined) {
        Omegga.whisper(player, `Brickadia Unlimited Mining Help Pages
        <color="00ff00">/helpmining basic</> - Basic functions of the game
        <color="00ff00">/helpmining info</> - How to play and extra info
        <color="00ff00">/helpmining buy</> - The different shop commands
        <color="00ff00">/helpmining drill</> - What drilling is and how to do it (soon!)
        <color="00ff00">/helpmining build</> - How building in the game works (soon!)
        <color="00ff00">/helpmining rank</> - What ranks are and how to rank up
        <color="00ff00">/helpmining donating</> - The different ways of donating to players
        <color="00ff00">/helpmining insurance</> - What insurance is and how to get it
        <color="00ff00">/helpmining chance</> - Explanation of Chance Blocks
        <color="00ff00">/helpmining admin</> - A description of admin capibilities.
        Use <color="00ff00">PageUp</> and <color="00ff00">PageDown</> to scroll through chat.`)
      } else if(section == "basic"){
        if(page == undefined|| page == "1"){
          Omegga.whisper(player, `Help page: Basic Commands
          Reset Your Stats - <color="00ff00">/resetmystats</>
          Teleport to one of the spawns - <color="00ff00">/spawn <number></>
          Teleport to your designated spawn - <color="00ff00">/respawn</>
          Upgrade one level - <color="00ff00">/upgradepick</>
          Upgrade multiple levels - <color="00ff00">/upgradeall</> or <color="00ff00">/upgradeall <amount></>
          View more of the basic commands -<color="00ffff>/helpmining basic 2</>"`)
        } else if(page == "2") {
          Omegga.whisper(player,`Help page: Basic Commands 2
          Private Message someone - (<color="00ff00">/pm</> or <color="00ff00">/msg</>) <color="00ff00"><name> <msg></> 
          Easily reply to the last DM - <color="00ff00">/r <msg></>
          Ignore DMs from someone - <color="00ff00">/ignore <name></>
          See a players playtime - <color="00ff00">/playtime <name></>`)
        }
      } else if(section == "info"){
        if(page == undefined|| page == "1"){
          Omegga.whisper(player,`Help page: Server Information
          Mine ores by clicking on them to recive money
          Use the money to upgrade and buy new items.
          Gamemode By <color="22ff77">Critical Floof</>`)
        }
      } else if(section == "buy"){
        if(page == undefined|| page == "1"){
          Omegga.whisper(player,`Help page: Shop
          For upgrading your pickaxe, use <color="00ff00">/helpmining basic</>
          Gun - <color="00ff00">/buy gun</> - <color="00aa00">$250</>
          Heat Suit - <color="00ff00">/buy heatsuit <amount></> - <color="00aa00">$200</> per layer
          Radiation Suit - <color="00ff00">/buy radsuit <amount></> - <color="00aa00">$500</> per layer
          Insurance - <color="00ff00">/buy insurance <amount></> - <color="00aa00">$0.8</> per unit
          Dirt - <color="00ff00">/buy dirt <amount></> - <color="00aa00">$1</> per unit
          To sell dirt - <color="00ff00">/sell dirt <amount></> - <color="00aa00">$1</> per unit`)
        }
      }
      
    })
    /*
    Unlimited
    Mining 
    Functionality
    */

    //Mining Functionality
      Omegga.on('interact', async ({ player, position, message }) => {
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
            
            //check what type of ore, and apply the type of ore to a tag
            interactOreIndex(ore)
            //Got to make the bricks serverside
              
  
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
                    if (Math.random() <= oreSpawnChance*4) {
                      const randomOre = Math.floor(Math.random()*Object.keys(OreData).length)
                      //pick the ore based on the random number
                      oreIndex(randomOre);
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
                        'BMC_Glass',
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
    return { registeredCommands: ['yes','no','resetmystats','money', 'balance','bal','upgradepick','upgradepickall','rankup','helpmining','suits','buy','depth','givememoney'] };
  }

  async stop() {
    // Anything that needs to be cleaned up...
  }
}


function interactOreIndex(ore) {
  if (ore == "dirt") {oreTag = OreData.dirt} else
  if (ore == "lava") {oreTag = OreData.lava} else
  if (ore == "iron") {oreTag = OreData.iron} else
  if (ore == "einsteinium") {oreTag = OreData.einsteinium} else
  if (ore == "tin") {oreTag = OreData.tin} else
  if (ore == "adamantium") {oreTag = OreData.adamantium} else
  if (ore == "copper") {oreTag = OreData.copper} else
  if (ore == "mithril") {oreTag = OreData.mithril} else
  if (ore == "orichalcum") {oreTag = OreData.orichalcum} else
  if (ore == "diamond") {oreTag = OreData.diamond} else
  if (ore == "diamondlattice") {oreTag = OreData.diamondlattice} else
  if (ore == "magnetite") {oreTag = OreData.magnetite} else
  if (ore == "brickite") {oreTag = OreData.brickite} else
  if (ore == "australium") {oreTag = OreData.australium} else
  if (ore == "coal") {oreTag = OreData.coal} else
  if (ore == "gold") {oreTag = OreData.gold} else
  if (ore == "cake") {oreTag = OreData.cake} else
  if (ore == "plasteel") {oreTag = OreData.plasteel}
}


function oreIndex(randomNumber) {
  
  if (randomNumber <= 1) {oreTypeJSON = OreData.lava} else
  if (randomNumber <= 2) {oreTypeJSON = OreData.iron} else
  if (randomNumber <= 3) {oreTypeJSON = OreData.einsteinium} else
  if (randomNumber <= 4) {oreTypeJSON = OreData.tin} else
  if (randomNumber <= 5) {oreTypeJSON = OreData.adamantium} else
  if (randomNumber <= 6) {oreTypeJSON = OreData.copper} else
  if (randomNumber <= 7) {oreTypeJSON = OreData.mithril} else
  if (randomNumber <= 8) {oreTypeJSON = OreData.orichalcum} else
  if (randomNumber <= 9) {oreTypeJSON = OreData.diamond} else
  if (randomNumber <= 10) {oreTypeJSON = OreData.diamondlattice} else
  if (randomNumber <= 11) {oreTypeJSON = OreData.magnetite} else
  if (randomNumber <= 12) {oreTypeJSON = OreData.brickite} else
  if (randomNumber <= 13) {oreTypeJSON = OreData.australium} else
  if (randomNumber <= 14) {oreTypeJSON = OreData.coal} else
  if (randomNumber <= 15) {oreTypeJSON = OreData.gold} else
  if (randomNumber <= 16) {oreTypeJSON = OreData.cake} else
  if (randomNumber <= 17) {oreTypeJSON = OreData.plasteel}

  oreType = oreTypeJSON.id;
}

function checkOverLimit() {
  if(isWorldGenerating) return
  if(emptyBricks.size >= mineLimit) {
    isWorldGenerating = true;
    Omegga.broadcast(`<size="40"><color="ff2222">Server has hit the mine limit! Caving in the mine in 10 seconds...</></>`)
    setTimeout(generateWorld, 10000)
  }

}


function generateWorld() {
  Omegga.writeln(`Bricks.Clearall`)
  Omegga.writeln(`Bricks.Load "UnlimitedMiningStructures/Spawn" 0 0 0 0`)
  Omegga.broadcast(`Generating World... You might want to press <size="24">ctrl+k</> to respawn.`)
  emptyBricks = new Set();
  isWorldGenerating = false;
}


