import {OdmdBuild, GithubRepo} from "./model/odmd-build";
import {AnyOdmdEnVer} from "./model/odmd-enver";
import {OdmdBuildNetworking} from "./repos/__networking/odmd-build-networking";
import {OdmdBuildDefaultVpcRds} from "./repos/_default-vpc-rds/odmd-build-default-vpc-rds";
import {OdmdBuildDefaultKubeEks} from "./repos/_default-kube-eks/odmd-build-default-kube-eks";
import {OdmdBuildContractsLib} from "./repos/__contracts/odmd-build-contracts-lib";
import {OdmdBuildUserAuth} from "./repos/__user-auth/odmd-build-user-auth";
import {OdmdEnverCdk} from "./model/odmd-enver-cdk";

export type GithubReposCentralView = {

    githubAppId: string;

    __contracts: GithubRepo
    __userAuth?: GithubRepo
    __eks?: GithubRepo
    __networking?: GithubRepo
    _defaultKubeEks?: GithubRepo
    _defaultVpcRds?: GithubRepo
}

export type AccountsCentralView = {
    central: string,
    networking?: string,
    workspace0: string,
}

/**
 * DNS config for a customer. Replaces the old `subDomain()` + `accountToOdmdHostedZone()`
 * pair. `undefined` at root = customer does not manage DNS via the platform.
 *
 * Conventions when an account entry is absent (and `accounts` is present or undefined):
 *   - central zone name = `<subDomain>.odmd.uk`
 *   - workspace<N> zone name = `ws<N>.<subDomain>.odmd.uk`
 *   - networking zone name = `networking.<subDomain>.odmd.uk`
 *   - any other account key → `<accountKey>.<subDomain>.odmd.uk`
 *
 * Setting `accounts[name] = undefined` explicitly opts the account out of DNS entirely.
 * Setting `accounts[name] = { hostedZoneId: 'Z...' }` reuses an existing manually-managed zone.
 * Setting `accounts[name] = { subDomain: 'customLabel' }` overrides the default label.
 */
export type DnsConfig = {
    /** Central label under odmd.uk. Lowercase. E.g. 'seed', 'sbx', 'kk'. */
    subDomain: string;
    /** Reuse an existing center zone by id. Undefined → (FUTURE) platform auto-creates. */
    hostedZoneId?: string;
    /** Per-account overrides and explicit opt-outs. */
    accounts?: {
        [accountName: string]: {
            /** Explicit zone id to reuse. Undefined → platform auto-creates for workspace-like accounts. */
            hostedZoneId?: string;
            /** Override the auto-derived label (default: `ws<N>` for workspace<N>, accountName otherwise). */
            subDomain?: string;
        } | undefined;
    };
};

/** Structured hosted-zone reference returned by `OdmdEnver.hostedZone`. */
export interface OdmdHostedZoneRef {
    /** Fully-qualified zone name, always present. */
    name: string;
    /** Explicit zone id when reusing a manual zone; undefined when platform-managed. */
    id?: string;
    /** True when the platform creates/owns this zone. */
    autoManaged: boolean;
}

export interface OdmdContractsCentralView<
    A extends AccountsCentralView,
    G extends GithubReposCentralView,
    C extends OdmdBuildContractsLib<A, G>
> {

    get contractsLibBuild(): C

    get accounts(): A

    get githubRepos(): G

    getAccountName(accId: string): keyof A

    getTargetEnver(): AnyOdmdEnVer | undefined

    get allAccounts(): string[]


    get odmdBuilds(): Array<OdmdBuild<AnyOdmdEnVer>>;


    readonly userAuth?: OdmdBuildUserAuth
    readonly networking?: OdmdBuildNetworking

    readonly eksCluster?: OdmdBuild<OdmdEnverCdk>
    readonly defaultVpcRds?: OdmdBuildDefaultVpcRds
    readonly defaultEcrEks?: OdmdBuildDefaultKubeEks

    readonly DEFAULTS_SVC?: OdmdBuild<AnyOdmdEnVer>[]


}
