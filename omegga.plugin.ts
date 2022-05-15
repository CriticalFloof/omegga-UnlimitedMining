//BRICKADIA UNLIMITED MINING

//Refactoring is needed.

import OmeggaPlugin, { OL, PS, PC, _OMEGGA_UTILS_IMPORT, WriteSaveObject, Vector} from 'omegga';
import OreData from './oredata.json';
import LayerData from './layerdata.json'



type Config = { mineLimit:number };

interface PlayerData {
  money:number,
  pickaxeStrength:number,
  levelUpCost:number,
  interactCooldown:boolean,
  heatSuits:number,
  radSuits:number,
  commandContext:string,
  rank:number
}

interface ServerStats {
  serverEconPercent:number,
  valueModifier:number
}

interface BlockData {
  clicksLeft:number
}


let isWorldGenerating:boolean;
let emptyBricks:Array<Vector>;

let oreTypeJSON:any;
let oreType:any;
let oreTag:any;
let oreValue:any;
let serverData:ServerStats;

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
    serverData = await this.store.get("serverStats")
    if(serverData == null) {
      serverData = {
      serverEconPercent:1,
      valueModifier:1
      }
      await this.store.set("serverStats",serverData)
    }
    Omegga.broadcast(`Loading<color="22ff77"><size="24"> Brickadia Unlimited Mining!</></>`)
    Omegga.broadcast(`<size="12">Verison 0.0.2</>`)

    mineLimit = this.config.mineLimit;

    

    generateWorld()

    setInterval(checkOverLimit,300000)

    //Give new players 

      Omegga
      .on('join', async player => {
        try {
          let playerData:PlayerData = await this.store.get(player.id)
          if (playerData == null) {
              playerData = {
              money:0,
              pickaxeStrength:1,
              levelUpCost:50,
              interactCooldown:false,
              heatSuits:0,
              radSuits:0,
              commandContext:"none",
              rank:0
            }
            await this.store.set(player.id,playerData)
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
          levelUpCost:50,
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
        if(playerData.rank*1000+1000 <= playerData.pickaxeStrength) {
          Omegga.whisper(player.name, `You can't upgrade your pick past ${playerData.rank*1000+1000}! Use /rankup instead.`)
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
    .on('cmd:upgradeall', async (name:string, amount?:number) => {
      const player = Omegga.getPlayer(name)
      let playerData:PlayerData = await this.store.get(player.id)
      let upgraded:boolean = false;

      if(amount != undefined) {
        if (playerData.money >= playerData.levelUpCost) upgraded = true;
        if(playerData.rank*1000+1000 <= playerData.pickaxeStrength) {
        Omegga.whisper(player.name, `You can't upgrade your pick past ${playerData.rank*1000+1000}! Use /rankup instead.`)
        return;
      }
      for (let i = 0; i < amount; i++) {
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
        if(playerData.rank*1000+1000 <= playerData.pickaxeStrength) {
          break;
        }
        } 
        if(upgraded) { 
          Omegga.whisper(player.name, `Pick upgraded to Level ${playerData.pickaxeStrength}`)
        } else {
          Omegga.whisper(player.name, `<color="ff4444">1 Upgrade Costs ${playerData.levelUpCost}. You need ${playerData.levelUpCost-playerData.money} more cash to upgrade your pickaxe!</>`)
        }
      } else { 
          if (playerData.money >= playerData.levelUpCost) upgraded = true;
        if(playerData.rank*1000+1000 <= playerData.pickaxeStrength) {
          Omegga.whisper(player.name, `You can't upgrade your pick past ${playerData.rank*1000+1000}! Use /rankup instead.`)
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
          if(playerData.rank*1000+1000 <= playerData.pickaxeStrength) {
            break;
          }
          } 
          if(upgraded) { 
            Omegga.whisper(player.name, `Pick upgraded to Level ${playerData.pickaxeStrength}`)
          } else {
            Omegga.whisper(player.name, `<color="ff4444">1 Upgrade Costs ${playerData.levelUpCost}. You need ${playerData.levelUpCost-playerData.money} more cash to upgrade your pickaxe!</>`)
        }
      }
      await this.store.set(player.id,playerData)
    })
    //Rank up
    .on('cmd:rankup', async name => {
      const player = Omegga.getPlayer(name)
      let playerData:PlayerData = await this.store.get(player.id)
      if (playerData.rank*1000+1000 <= playerData.pickaxeStrength) {
        playerData.rank += 1;
        playerData.pickaxeStrength = 1;
        Omegga.whisper(name,`You are now rank ${playerData.rank}.`)
        await this.store.set(player.id,playerData)
        return;
      }
      Omegga.whisper(name,`You must reach your max level (${playerData.rank*1000+1000}) before ranking up.`)
    })





    //Shop Command
    .on('cmd:buy', async (name:string, buyType:string, amount:number) => {
      let quantity:number;
      if (amount == undefined) {quantity = 1} else {quantity = Number(amount)}
      const player = Omegga.getPlayer(name)
      let playerData:PlayerData = await this.store.get(player.id)
      let buyValue:number;
      if(buyType === "heatsuit") {buyValue = 200;}
      if(buyType === "radsuit") {buyValue = 500;}
      if(buyType === "gun") {buyValue = 250;}
      const price = buyValue*quantity
      if(playerData.money >= price) {
        if(buyType === "heatsuit") {
          playerData.heatSuits += quantity;
          playerData.money += -price;
          Omegga.whisper(player.name, `Bought ${quantity} Heatsuits For <color="44ff44">${price}$</>`)
          Omegga.whisper(player.name, `You now have ${playerData.heatSuits} Heatsuits`)
        };
        if(buyType === "radsuit") {
          playerData.radSuits += quantity;
          playerData.money += -price;
          Omegga.whisper(player.name, `Bought ${quantity} Radsuits For <color="44ff44">${price}$</>`)
          Omegga.whisper(player.name, `You now have ${playerData.radSuits} Radsuits`)
        };
        if(buyType === "gun") {
          playerData.money += -price;
          Omegga.writeln(`Server.Players.GiveItem "${player.name}" weapon_pistol`)
          Omegga.whisper(player.name, `Bought a Gun for <color="44ff44">${price}$</>`)
        };
        
      } else if (playerData.money <= price){
        Omegga.whisper(player.name, `<color="ff4444">${quantity} ${buyType} Costs ${price}$. You have ${playerData.money}$</>`)
      } else {
        Omegga.whisper(player.name, `<color="ff4444">Item Not Found.</>`)
      }
      await this.store.set(player.id,playerData)
    })
    //Depth Check
    .on('cmd:depth', async (name)  => {
      const playerPosition = await Omegga.getPlayer(name).getPosition();
      let playerZ = playerPosition[2]/20
      let height;
      if(playerZ > 0){height = "height"} else {height = "depth"; playerZ *= -1}
      const depth = playerZ.toFixed()
      
      Omegga.whisper(name,`Your ${height} is ${depth}`)
    })
    //help
    .on('cmd:helpmining', async (name:string, section:string, page:string)  => {
      const player = Omegga.getPlayer(name)
      if(section == undefined) {
        Omegga.whisper(player, `<size="24"><color="00ffff"> > Brickadia Unlimited Mining Help Pages</></>
        <color="00ffff"> > </><color="00ff00">/helpmining basic</> - Basic functions of the game
        <color="00ffff"> > </><color="00ff00">/helpmining info</> - How to play and extra info
        <color="00ffff"> > </><color="00ff00">/helpmining buy</> - The different shop commands
        <color="00ffff"> > </><color="00ff00">/helpmining drill</> - What drilling is and how to do it (soon!)
        <color="00ffff"> > </><color="00ff00">/helpmining build</> - How building in the game works (soon!)
        <color="00ffff"> > </><color="00ff00">/helpmining rank</> - What ranks are and how to rank up
        <color="00ffff"> > </><color="00ff00">/helpmining donating</> - The different ways of donating to players
        <color="00ffff"> > </><color="00ff00">/helpmining insurance</> - What insurance is and how to get it
        <color="00ffff"> > </><color="00ff00">/helpmining chance</> - Explanation of Chance Blocks
        <color="00ffff"> > </><color="00ff00">/helpmining admin</> - A description of admin capibilities.
        <color="00ffff"> > </>Use <color="00ff00">PageUp</> and <color="00ff00">PageDown</> to scroll through chat.`)
      } else if(section == "basic"){
        if(page == undefined|| page == "1"){
          Omegga.whisper(player, `<size="24"><color="00ffff"> > </>Help page: <color="00ff00">Basic Commands</></>
          <color="00ffff"> > </>Reset Your Stats - <color="00ff00">/resetmystats</>
          <color="00ffff"> > </>Teleport to one of the spawns - <color="00ff00">/spawn [number]</> (SOON!)
          <color="00ffff"> > </>Teleport to your designated spawn - <color="00ff00">/respawn</> (SOON!)
          <color="00ffff"> > </>Upgrade one level - <color="00ff00">/upgradepick</>
          <color="00ffff"> > </>Upgrade multiple levels - <color="00ff00">/upgradeall</> or <color="00ff00">/upgradeall [amount]</>
          <color="00ffff"> > </>View more of the basic commands -<color="00ffff>/helpmining basic 2</>"`)
        } else if(page == "2") {
          Omegga.whisper(player,`<size="24"><color="00ffff"> > </>Help page: <color="00ff00">Basic Commands 2</></>
          <color="00ffff"> > </>Private Message someone - (<color="00ff00">/pm</> or <color="00ff00">/msg</>) <color="00ff00">[name] [msg]</> (SOON!)
          <color="00ffff"> > </>Easily reply to the last DM - <color="00ff00">/r [msg]</> (SOON!)
          <color="00ffff"> > </>Ignore DMs from someone - <color="00ff00">/ignore [name]</> (SOON!)
          <color="00ffff"> > </>See a players playtime - <color="00ff00">/playtime [name]</> (SOON!)
          <color="00ffff"> > </>Check your depth - <color="00ff00">/depth</>`)
        }
      } else if(section == "info"){
        if(page == undefined|| page == "1"){
          Omegga.whisper(player,`<size="24"><color="00ffff"> > </>Help page: <color="00ff00">Server Information</></>
          <color="00ffff"> > </>Mine ores by clicking on them to recive money
          <color="00ffff"> > </>Use the money to upgrade and buy new items.
          <color="00ffff"> > </>Gamemode By <color="22ff77">Critical Floof</>`)
        }
      } else if(section == "buy"){
        if(page == undefined|| page == "1"){
          Omegga.whisper(player,`<size="24"><color="00ffff"> > </>Help page: <color="00ff00">Shop</></>
          <color="00ffff"> > </>For upgrading your pickaxe, use <color="00ff00">/helpmining basic</>
          <color="00ffff"> > </>Gun - <color="00ff00">/buy gun</> - <color="00aa00">$250</>
          <color="00ffff"> > </>Heat Suit - <color="00ff00">/buy heatsuit [amount]</> - <color="00aa00">$200</> per layer
          <color="00ffff"> > </>Radiation Suit - <color="00ff00">/buy radsuit [amount]</> - <color="00aa00">$500</> per layer
          <color="00ffff"> > </>Insurance - <color="00ff00">/buy insurance [amount]</> - <color="00aa00">$0.8</> per unit (SOON!)
          <color="00ffff"> > </>Dirt - <color="00ff00">/buy dirt [amount]</> - <color="00aa00">$1</> per unit (SOON!)
          <color="00ffff"> > </>To sell dirt - <color="00ff00">/sell dirt [amount]</> - <color="00aa00">$1</> per unit (SOON!)`)
        }
      } else if(section == "drill"){
        if(page == undefined|| page == "1"){
          Omegga.whisper(player,`<size="24"><color="00ffff"> > </>Help page: <color="00ff00">Drills (SOON!)</></>
          <color="00ffff"> > </>Drills are a quicker method of digging tunnels.
          <color="00ffff"> > </>A basic drill does not return the cash from ores it destroys.
          <color="00ffff"> > </>Drills consume dirt as fuel; 1 fuel for 1 block drilled.
          <color="00ffff"> > </>Drills can only run on the same surface that you click, holes will cause irregularities
          <color="00ffff"> > </>To start a drill, use <color="00ff00">/drill [depth] [size]</>
          <color="00ffff"> > </>For further information, use <color="00ff00">/helpmining drill 2</>`)
        } else if(page == "2"){
          Omegga.whisper(player,`<size="24"><color="00ffff"> > </>Help page: <color="00ff00">Drills 2 (SOON!)</></>
          <color="00ffff"> > </>Drill twice as fast for the cost of 25 pick levels with <color="00ff00">/buyturbodrill</>
          <color="00ffff"> > </>Drill ten times faster for the cost of 150 pick levels<color="00ff00">/buysuperturbodrill</>
          <color="00ffff"> > </>Drill without destroying ores with the Ore Drill for the cost of 50 pick levels with <color="00ff00">/buyoredrill</>
          <color="00ffff"> > </>The Ore Drill uses 5x more dirt than the basic drill. Use it with <color="00ff00">/oredrill [depth] [size]</>
          <color="00ffff"> > </>The Lava Drill uses 6x more dirt than the basic drill. Use it with <color="00ff00">/lavadrill [depth] [size]</>`)
        }
      } else if(section == "build"){
        if(page == undefined|| page == "1"){
          Omegga.whisper(player,`<size="24"><color="00ffff"> > </><color="00ff00">Help page: Building (SOON!)</></>`)
        }
      } else if(section == "rank"){
        if(page == undefined|| page == "1"){
          Omegga.whisper(player,`<size="24"><color="00ffff"> > </>Help page: <color="00ff00">Ranks</></>
          <color="00ffff"> > </>Everyone starts with Rank 0.
          <color="00ffff"> > </>You gain Rank 1 at level 1000.
          <color="00ffff"> > </>The Max rank is 100.
          <color="00ffff"> > </>When you rank up, your pick level is reset to
          <color="00ffff"> > </>near level 1, but you gain bonuses.
          <color="00ffff"> > </>One of the minor bonuses are larger drills.`)
        }
      } else if(section == "donating"){
        if(page == undefined|| page == "1"){
          Omegga.whisper(player,`<size="24"><color="00ffff"> > </>Help page: <color="00ff00">Donating</></>
          <color="00ffff"> > </>Donating money - <color="00ff00">/donate [player] [amount]</>
          <color="00ffff"> > </>Donating dirt - <color="00ff00">/donatedirt [p] [a]</>
          <color="00ffff"> > </>Donating heatsuits - <color="00ff00">/donatehs [p] [a]</>
          <color="00ffff"> > </>Donating radsuits - <color="00ff00">/donaters [p] [a]</>`)
        }
      } else if(section == "insurance"){
        if(page == undefined|| page == "1"){
          Omegga.whisper(player,`<size="24"><color="00ffff"> > </>Help page: <color="00ff00">Insurance</></>
          <color="00ffff"> > </>Insurance protects you from the bad effects of Chance Blocks.
          <color="00ffff"> > </>When you mine a Chance Block, your insurance will cover all or only
          <color="00ffff"> > </>some of the loss, depending on how much insurance you have.
          <color="00ffff"> > </>Insurance costs <color="00aa00">$0.8</> per unit, and is bought with <color="00ff00">/buy insurance [amount]</>
          <color="00ffff"> > </><color="ff0000">Insurance is lost when you log out</>`)
        }
      } else if(section == "chance"){
        if(page == undefined|| page == "1"){
          Omegga.whisper(player,`<size="24"><color="00ffff"> > </>Help page: <color="00ff00">Chance Blocks</></>
          <color="00ffff"> > </>Chance Blocks give a random reward when mined.
          <color="00ffff"> > </>Whether the reward is "good" or "bad" is random.
          <color="00ffff"> > </>You can use insurance (<color="00ff00">/helpmining insurance</>) to prevent losses.
          <color="00ffff"> > </>Radioactive Chance Blocks and Core Chance Blocks appear deep underground, and
          <color="00ffff"> > </>have more extreme rewards, respectively. Core Chance Blocks are mostly immune to 
          <color="00ffff"> > </>insurance and have a 10% greater chance to give a "bad" reward.`)
        }
      } else if(section == "admin"){
        if(page == undefined|| page == "1"){
          Omegga.whisper(player,`<size="24"><color="00ffff"> > </>Help page: <color="00ff00">Admin</></>
          <color="00ffff"> > </>Admins monitor the server. helping players and
          <color="00ffff"> > </>removing those who dont follow the rules.
          <color="00ffff"> > </>Admin Privileges:
          <color="00ffff"> > </>- Access to players' stats
          <color="00ffff"> > </>- Can set buffs and yields
          <color="00ffff"> > </>- Access to debug and power mode
          <color="00ffff"> > </>- More.`)
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
              
            //Take the brick's position and set the store key to it's position
              
              let blockData:BlockData = await this.store.get(`${positionX},${positionY},${positionZ}`)
              if(blockData == null) {
                blockData = {
                  clicksLeft:oreTag.duribility
                }
                let lastClicksLeft = null;
                let blockTimer = setInterval(async () => {
                  let updatedBlockData:BlockData = await this.store.get(`${positionX},${positionY},${positionZ}`)
                  if(updatedBlockData == null) {
                    clearInterval(blockTimer)
                    return;
                  } 
                  if(lastClicksLeft != null) {
                    if(updatedBlockData.clicksLeft >= lastClicksLeft){
                      this.store.delete(`${positionX},${positionY},${positionZ}`)
                    }
                  }
                  lastClicksLeft = updatedBlockData.clicksLeft 
                },10000)
              }
              blockData.clicksLeft += -playerData.pickaxeStrength;
              if(blockData.clicksLeft <= 0) {
                // Deleting and storing the brick coordinates in a set as well as deleting the plugin store location and it's timer
                emptyBricks.push([positionX, positionY, positionZ]);
                Omegga.writeln(`Bricks.ClearRegion ${position[0]} ${position[1]} ${position[2]} 20 20 20`);


                // Comparing index and placing neighbour dirt 
                const publicUser = {
                  id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
                  name: 'Generator',
                };
                
                
                
                let brickPos = [];
              
                //Check if neighbours have been previously mined
                const x0:Vector = [positionX-40, positionY, positionZ]
                const y0:Vector = [positionX, positionY-40, positionZ]
                const z0:Vector = [positionX, positionY, positionZ-40]
                const x1:Vector = [positionX+40, positionY, positionZ]
                const y1:Vector = [positionX, positionY+40, positionZ]
                const z1:Vector = [positionX, positionY, positionZ+40]

                let x0push = true
                let y0push = true
                let z0push = true
                let x1push = true
                let y1push = true
                let z1push = true
                for(let i = 0; i < emptyBricks.length; i++) {
                  if (emptyBricks[i][0] == x0[0]&&emptyBricks[i][1] == x0[1]&&emptyBricks[i][2] == x0[2]){x0push = false}
                  if (emptyBricks[i][0] == y0[0]&&emptyBricks[i][1] == y0[1]&&emptyBricks[i][2] == y0[2]){y0push = false}
                  if (emptyBricks[i][0] == z0[0]&&emptyBricks[i][1] == z0[1]&&emptyBricks[i][2] == z0[2]){z0push = false}
                  if (emptyBricks[i][0] == x1[0]&&emptyBricks[i][1] == x1[1]&&emptyBricks[i][2] == x1[2]){x1push = false}
                  if (emptyBricks[i][0] == y1[0]&&emptyBricks[i][1] == y1[1]&&emptyBricks[i][2] == y1[2]){y1push = false}
                  if (emptyBricks[i][0] == z1[0]&&emptyBricks[i][1] == z1[1]&&emptyBricks[i][2] == z1[2]){z1push = false}
                }

                  // Ore randomizer !!!Please Update this
                  for(let i = 0; 6 > i; i++){
                    brickPos = []
                    //Ores that generate
                    if (Math.random() <= oreSpawnChance*4) {
                      
                      //pick the ore based on the random number
                      oreIndex(positionZ/20);
                    } else 
                    //What kind of dirt is shown at depth
                    { 
                      if(i == 2){layerDepthIndex((positionZ-40)/20);}
                      if(i == 5){layerDepthIndex((positionZ+40)/20);}
                      if(i == 0 || i == 1 || i == 3 || i == 4){layerDepthIndex((positionZ)/20);}
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
                if(oreValue != 0) {
                  Omegga.middlePrint(player.name,`Mined ${oreTag.name} <br><color="44ff44">Worth ${oreValue}$</></>`)
                  playerData.money += oreValue
                } else {
                  Omegga.middlePrint(player.name,`Mined ${oreTag.name}`)
                }
              } //Outside the "breaking brick" Conditional vvv
              else {
                if(oreValue != 0) {
                  Omegga.middlePrint(player.name,`${oreTag.name} ${blockData.clicksLeft} / ${oreTag.duribility} <br><color="44ff44">Worth ${oreValue}$</></>`)
                } else {
                  Omegga.middlePrint(player.name,`${oreTag.name} ${blockData.clicksLeft} / ${oreTag.duribility}`)
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
                await this.store.set(`${positionX},${positionY},${positionZ}`,blockData)
              }
            await this.store.set(player.id,playerData)
          }
        }
        
      });
    return { registeredCommands: ['yes','no','resetmystats','money', 'balance','bal','upgradepick','upgradeall','rankup','helpmining','suits','buy','depth','givememoney'] };
  }

  async stop() {
    // Anything that needs to be cleaned up...
  }
}

//This function handles all different minable bricks and sets the oretag to what was clicked
async function interactOreIndex(ore) {

  let layerIndex = [];
  for(let i in LayerData){
    layerIndex.push(LayerData [i])
  }

  for(let i = 0; i < layerIndex.length; i++) {
    if (ore == layerIndex[i].id) {oreTag = layerIndex[i]}
  }

    let oreIndex = [];
  for(let i in OreData){
    oreIndex.push(OreData [i])
  }

  for(let i = 0; i < oreIndex.length; i++) {
    if (ore == oreIndex[i].id) {oreTag = oreIndex[i]}
  }

  if(oreTag.isOre == false) {
    oreValue = 0
  } else {
    oreValue = Math.floor((oreTag.duribility/4)*serverData.serverEconPercent*serverData.valueModifier)
  }
}


function oreIndex(depth) {

  let oreIndex = [];
  let weightedOreIndex = [];
  let j = 0;
  let weightTotal = 0;
  for(let i in OreData){
    oreIndex.push(OreData [i])
    if(depth<oreIndex[j].depth){
      weightTotal += oreIndex[j].chanceWeight*10
    } else if(depth<oreIndex[j].depth-2000&&depth>oreIndex[j].depth-10000){
      //num from 0 - 8000
      let difference = depth-oreIndex[j].depth-2000
      difference = (difference/-80)+100
      if(difference < 10) difference = 10
      weightTotal += oreIndex[j].chanceWeight*10/difference
    } else if(depth<oreIndex[j].depth-10000){
      weightTotal += oreIndex[j].chanceWeight*10/10
    }
    weightTotal = Math.floor(weightTotal)
    weightedOreIndex.push(weightTotal)
    j++
  }
  const randomNumber = Math.random()*weightTotal
  let isFound = false
  for(let i = 0; i < weightedOreIndex.length; i++){
    if(randomNumber <= weightedOreIndex[i] && !isFound){
      oreTypeJSON = oreIndex[i]
      isFound = true;
    }
    
  }
  oreType = oreTypeJSON.id;
}

function layerDepthIndex(depth){
  let isFound = false;
  let layerIndex = [];
  for(let i in LayerData) {
    layerIndex.push(LayerData [i])
  }
  layerIndex.reverse()
  for(let i = 0; i < layerIndex.length; i++){
    if(depth <= layerIndex[i].depth &&!isFound){
      oreTypeJSON = layerIndex[i]
      isFound = true;
    }
  }
  
  oreType = oreTypeJSON.id;
}

function checkOverLimit() {
  if(isWorldGenerating) return
  if(emptyBricks.length >= mineLimit) {
    isWorldGenerating = true;
    Omegga.broadcast(`<size="40"><color="ff2222">Server has hit the mine limit! Caving in the mine in 10 seconds...</></>`)
    setTimeout(generateWorld, 10000)
  } else {
    Omegga.broadcast(`<color="00ffff"> > </>Mined Bricks <color="00ff00">${emptyBricks.length}<color="ffffff">/</>${mineLimit}</>`)
  }

}


function generateWorld() {
  Omegga.writeln(`Bricks.Clearall`)
  Omegga.writeln(`Bricks.Load "UnlimitedMiningStructures/Spawn" 0 0 0 1`)
  Omegga.broadcast(`Generating World... You might want to press <size="24">ctrl+k</> to respawn.`)
  emptyBricks = [];
  isWorldGenerating = false;
}

